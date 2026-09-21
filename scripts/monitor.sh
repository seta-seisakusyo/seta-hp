#!/bin/bash
# 自己ホスト型 監視＆アラート
# - コンテナ稼働/health、サイト到達(end-to-end)、TLS証明書の残日数、ディスク、メモリをチェック
# - 異常時に管理者へメール通知（HPの SMTP=next/.env を利用、python3 smtplib）
# - 同一問題の連続通知はクールダウンで抑止
# - コンテナの自動復旧は各 compose の restart:unless-stopped に委ねる
#
# cron例（5分毎）:
#   */5 * * * * /home/ubuntu/seta-hp/scripts/monitor.sh >> /home/ubuntu/monitor.log 2>&1
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATE_FILE="${MONITOR_STATE_FILE:-$HOME/.monitor_state}"
COOLDOWN_SEC="${MONITOR_COOLDOWN_SEC:-10800}"       # 同一問題の再通知抑止(既定3h)
DISK_THRESHOLD="${MONITOR_DISK_PCT:-85}"            # ディスク使用率の警告閾値(%)
MEM_MIN_MB="${MONITOR_MEM_MIN_MB:-120}"             # 空きメモリの警告閾値(MB)
HEALTH_SKIP="${MONITOR_HEALTH_SKIP:-nginx_proxy}"   # サイト到達で別途判定するコンテナ
EXPECTED_CONTAINERS="${MONITOR_CONTAINERS:-next_app nginx_proxy mysql_db}"
SITE_URL="${MONITOR_SITE_URL:-https://kaza-love.com/api/health}"
CERT_HOST="${MONITOR_CERT_HOST:-kaza-love.com}"      # TLS証明書を実測する対象ホスト
CERT_MIN_DAYS="${MONITOR_CERT_MIN_DAYS:-20}"         # 証明書残日数の警告閾値(日)。0で無効
MONITOR_DESIGNER="${MONITOR_DESIGNER:-1}"
MONITOR_SEND_EMAIL="${MONITOR_SEND_EMAIL:-1}"
DESIGNER_URL="${MONITOR_DESIGNER_URL:-https://designer.kaza-love.com/}"
DESIGNER_PROJECT_DIR="${DESIGNER_PROJECT_DIR:-$(dirname "$PROJECT_DIR")/display_design}"
DESIGNER_ENV_FILE="${DESIGNER_ENV_FILE:-}"
DESIGNER_COMPOSE_FILE="${DESIGNER_COMPOSE_FILE:-}"
DESIGNER_SERVICES="${MONITOR_DESIGNER_SERVICES:-}"

# shellcheck source=scripts/lib/designer-compose.sh
. "$SCRIPT_DIR/lib/designer-compose.sh"

# problems は通知本文用(可変の詳細を含む)、problems_key はクールダウン判定用の安定表現。
# curl のエラー文にはミリ秒など実行毎に変わる値が混ざるため、そのままハッシュすると
# 同一障害でも毎回別問題と見なされ、5分毎にメールが飛んでしまう。
problems=""
problems_key=""
add() { problems+="- $1"$'\n'; problems_key+="- ${2:-$1}"$'\n'; }

check_container() {
  local label="$1"
  local ref="$2"
  local st hc
  st="$(docker inspect --format '{{.State.Status}}' "$ref" 2>/dev/null || echo missing)"
  if [ "$st" != "running" ]; then
    add "コンテナ $label が起動していない (状態: $st)"
    return
  fi
  case " $HEALTH_SKIP " in
    *" $label "*|*" $ref "*) return ;;
  esac
  hc="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$ref" 2>/dev/null)"
  [ "$hc" = "unhealthy" ] && add "コンテナ $label が unhealthy"
}

# --- HPコンテナ稼働・health ---
for container in $EXPECTED_CONTAINERS; do
  check_container "$container" "$container"
done

# --- Designerコンテナ稼働・health（Composeのサービス名から動的解決） ---
if [ "$MONITOR_DESIGNER" != "0" ]; then
  configure_designer_compose
  if [ ! -f "$DESIGNER_ENV_FILE" ] || [ ! -f "$DESIGNER_COMPOSE_FILE" ]; then
    add "DesignerのenvまたはComposeファイルがない ($DESIGNER_ENV_FILE / $DESIGNER_COMPOSE_FILE)"
  else
    if [ -z "$DESIGNER_SERVICES" ]; then
      DESIGNER_SERVICES="$(designer_compose config --services 2>/dev/null | awk '/(^|-)mysql$|(^|-)backend$|(^|-)frontend$/{print}')"
    fi
    if [ -z "$DESIGNER_SERVICES" ]; then
      add "Designerの監視対象サービスをCompose設定から特定できない"
    else
      for service in $DESIGNER_SERVICES; do
        container_id="$(designer_compose ps -a -q "$service" 2>/dev/null)"
        if [ -z "$container_id" ]; then
          add "Designerサービス $service のコンテナが存在しない"
        else
          check_container "Designer/$service" "$container_id"
        fi
      done
    fi
  fi
fi

# --- サイト到達(end-to-end) ---
# curlは証明書エラー等で失敗しても %{http_code} に 000 を出力した上で非ゼロ終了するため、
# `|| echo 000` だと 000 が二重に連結される(000000)。出力が空のときだけ補う。
#
# HTTP 000 は「レスポンスを受け取れなかった」以上の情報を持たず、失効/DNS/接続断/タイムアウトの
# どれなのかが本文から判別できない。2026-09-14 の証明書失効時、通知が症状だけだったため
# 原因特定にgit履歴の遡りが必要になった。curlの終了コードとstderrも併記する。
CURL_STDERR_FILE="$(mktemp)"
trap 'rm -f "$CURL_STDERR_FILE"' EXIT

curl_reason() {
  case "$1" in
    0)   printf '' ;;
    5|6) printf 'DNS解決に失敗' ;;
    7)   printf '接続を拒否/到達不可' ;;
    28)  printf 'タイムアウト' ;;
    35)  printf 'TLSハンドシェイクに失敗' ;;
    51)  printf 'TLS証明書/公開鍵がホストと一致しない' ;;
    60)  printf 'TLS証明書を検証できない(失効・期限切れ・ホスト名不一致など)' ;;
    *)   printf 'curl終了コード %s' "$1" ;;
  esac
}

# command substitution はサブシェルなので関数内の代入が親へ戻らない。
# コードと失敗理由の両方をグローバル経由で受け渡す。
HTTP_CODE=""
HTTP_DETAIL=""
probe_http() {
  local rc err
  HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$1" 2>"$CURL_STDERR_FILE")"
  rc=$?
  HTTP_CODE="${HTTP_CODE:-000}"
  HTTP_DETAIL="$(curl_reason "$rc")"
  # curlのエラーは複数行(60番なら証明書の解説が続く)。原因が載るのは先頭の
  # `curl: (N) ...` 行なので、それを優先して拾う。
  err="$(tr -d '\r' < "$CURL_STDERR_FILE" | sed -n 's/^curl: ([0-9]*) //p' | head -1)"
  if [ -n "$err" ]; then
    HTTP_DETAIL="${HTTP_DETAIL:+$HTTP_DETAIL: }$err"
  fi
}

probe_http "$SITE_URL"
[ "$HTTP_CODE" = "200" ] || add \
  "サイト($SITE_URL)が異常 (HTTP $HTTP_CODE${HTTP_DETAIL:+ / $HTTP_DETAIL})" \
  "サイト($SITE_URL)が異常 (HTTP $HTTP_CODE)"
if [ "$MONITOR_DESIGNER" != "0" ]; then
  # Designerはゲートで未ログイン時302。502/000等なら異常。
  probe_http "$DESIGNER_URL"
  case "$HTTP_CODE" in
    200|301|302|401|403) : ;;
    *) add \
         "designer($DESIGNER_URL)が異常 (HTTP $HTTP_CODE${HTTP_DETAIL:+ / $HTTP_DETAIL})" \
         "designer($DESIGNER_URL)が異常 (HTTP $HTTP_CODE)" ;;
  esac
fi

# --- TLS証明書の残日数 ---
# ファイルではなく実際に配信中の証明書を見る。更新漏れ(cron停止)と
# 更新はできたがNginxをreloadし損ねたケースの両方を同じ検査で拾うため。
CERT_SUMMARY="チェック無効 (MONITOR_CERT_MIN_DAYS=0)"
if [ "$CERT_MIN_DAYS" != "0" ]; then
  cert_end="$(echo | timeout 20 openssl s_client -connect "$CERT_HOST:443" -servername "$CERT_HOST" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
  # date -d "" は失敗せず現在時刻を返すため、空判定を date より前に行う。
  cert_end_ts=""
  [ -n "$cert_end" ] && cert_end_ts="$(date -d "$cert_end" +%s 2>/dev/null || echo "")"
  if [ -z "$cert_end_ts" ]; then
    CERT_SUMMARY="取得不能 ($CERT_HOST:443 へのTLS接続が成立しない)"
    add "TLS証明書の有効期限を取得できない ($CERT_HOST:443)"
  else
    cert_days=$(( (cert_end_ts - $(date +%s)) / 86400 ))
    CERT_SUMMARY="$CERT_HOST 残り${cert_days}日 (期限 $cert_end)"
    if [ "$cert_days" -lt 0 ]; then
      add "TLS証明書が失効している ($CERT_HOST, 期限 $cert_end)"
    elif [ "$cert_days" -lt "$CERT_MIN_DAYS" ]; then
      add "TLS証明書の残り ${cert_days}日 (閾値 ${CERT_MIN_DAYS}日, $CERT_HOST, 期限 $cert_end)"
    fi
  fi
fi

# --- ディスク ---
disk="$(df / | awk 'NR==2{gsub("%","",$5); print $5}')"
[ "${disk:-0}" -ge "$DISK_THRESHOLD" ] && add "ディスク使用率 ${disk}% (閾値 ${DISK_THRESHOLD}%)"

# --- メモリ ---
memav="$(free -m | awk 'NR==2{print $7}')"
[ "${memav:-9999}" -lt "$MEM_MIN_MB" ] && add "空きメモリ ${memav}MB (閾値 ${MEM_MIN_MB}MB)"

ts="$(date '+%Y-%m-%d %H:%M:%S')"
if [ -z "$problems" ]; then
  echo "[$ts] OK"
  rm -f "$STATE_FILE"
  exit 0
fi

# --- 通知本文に添える環境情報 ---
# 「どのホストの、どの版のスクリプトが、何を見て異常と判断したのか」をメール単体で追えるようにする。
# 開発機と本番は同じcomposeスタックが動いていて紛らわしく、送信元の特定に手間がかかる。
# デプロイは scripts/ を IMAGE_TAG のSHAから再展開する(deploy_production.yml)ため、
# IMAGE_TAG はそのままこのスクリプト自身の版を指す。HEADはcheckout -- で動かないので使わない。
deployed_tag="$(grep -m1 '^IMAGE_TAG=' "$PROJECT_DIR/.env" 2>/dev/null | cut -d= -f2)"
host_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
monitor_targets="$SITE_URL"
[ "$MONITOR_DESIGNER" != "0" ] && monitor_targets="$monitor_targets , $DESIGNER_URL"
context="【検知時刻】     $ts
【ホスト】       $(hostname) (${host_ip:-IP不明})
【デプロイSHA】  ${deployed_tag:-unknown}  ※scripts/ はこのSHAから展開される
【監視対象】     $monitor_targets
【TLS証明書】    $CERT_SUMMARY
【ディスク】     ${disk:-?}% 使用 (閾値 ${DISK_THRESHOLD}%)
【空きメモリ】   ${memav:-?}MB (閾値 ${MEM_MIN_MB}MB)"

# HTTP 000 はステータスコードではないので、受け取った側が誤解しないよう意味を添える。
hints=""
case "$problems" in
  *"HTTP 000"*)
    hints="
【HTTP 000 について】
HTTPステータスではなく「レスポンスを受け取れなかった」ことを示す。
実際の理由は上の各行の \" / \" 以降に curl が報告したものを載せている。
TLS証明書の失効・期限切れが原因の場合は、本番で以下を実行して更新とNginxのreloadを確認する:
  sudo bash scripts/renew-ssl.sh
"
    ;;
esac

printf '[%s] 異常検知:\n%s\n%s\n' "$ts" "$problems" "$context"

# --- クールダウン（同一問題の連続通知を抑止） ---
# ハッシュは problems ではなく problems_key から取る。curlのエラー文に含まれる
# 実行毎に変わる値(経過ミリ秒など)でクールダウンが無効化されるのを防ぐため。
hash_now="$(printf '%s' "$problems_key" | md5sum | cut -d' ' -f1)"
now="$(date +%s)"
if [ -f "$STATE_FILE" ]; then
  read -r last_hash last_ts < "$STATE_FILE" 2>/dev/null || true
  if [ "${last_hash:-}" = "$hash_now" ] && [ "$(( now - ${last_ts:-0} ))" -lt "$COOLDOWN_SEC" ]; then
    echo "[$ts] 同一問題のためメール抑止(cooldown中)"
    exit 0
  fi
fi
echo "$hash_now $now" > "$STATE_FILE"

# --- メール通知（SMTP from next/.env） ---
set -a; [ -f "$PROJECT_DIR/next/.env" ] && . "$PROJECT_DIR/next/.env"; set +a
ALERT_TO="${MONITOR_ALERT_TO:-${CONTACT_TO_EMAIL:-${SMTP_USER:-}}}"
if [ "$MONITOR_SEND_EMAIL" != "0" ] && [ -n "${SMTP_HOST:-}" ] && [ -n "$ALERT_TO" ]; then
  export MAIL_TO="$ALERT_TO"
  export MAIL_SUBJECT="[kaza-love監視] 異常検知 $ts"
  export MAIL_BODY="サーバー($(hostname))で異常を検知しました。

${context}

【検知した異常】
${problems}${hints}
-- 自動監視 scripts/monitor.sh"
  export SMTP_HOST SMTP_PORT="${SMTP_PORT:-587}" SMTP_USER="${SMTP_USER:-}" SMTP_PASS="${SMTP_PASS:-}"
  python3 - <<'PY'
import os, smtplib, ssl
from email.message import EmailMessage
msg = EmailMessage()
msg["Subject"] = os.environ["MAIL_SUBJECT"]
msg["From"] = os.environ.get("SMTP_USER") or os.environ["MAIL_TO"]
msg["To"] = os.environ["MAIL_TO"]
msg.set_content(os.environ["MAIL_BODY"])
host = os.environ["SMTP_HOST"]; port = int(os.environ.get("SMTP_PORT", "587"))
user = os.environ.get("SMTP_USER"); pw = os.environ.get("SMTP_PASS")
try:
    if port == 465:
        srv = smtplib.SMTP_SSL(host, port, timeout=20)
    else:
        srv = smtplib.SMTP(host, port, timeout=20)
        srv.starttls(context=ssl.create_default_context())
    if user and pw:
        srv.login(user, pw)
    srv.send_message(msg); srv.quit()
    print("alert mail sent to", os.environ["MAIL_TO"])
except Exception as e:
    print("alert mail FAILED:", e)
PY
else
  echo "[$ts] メール通知無効またはSMTP未設定のため送信スキップ(ログのみ)"
fi
