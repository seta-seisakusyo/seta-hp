#!/bin/bash
# logrotate/seta-hp を /etc/logrotate.d/seta-hp へ導入する（setup-monitoring.sh から呼ばれる）。
#
# 同じログを対象にした既存設定があると二重にローテーションされるため、導入前に解消する。
# - 既存設定が「このリポジトリが扱うログだけ」を対象にしている（例: nginx パッケージ既定の
#   /etc/logrotate.d/nginx）なら、/etc/logrotate.d の外へ退避してから導入する
# - ほかのログも対象にしている設定は自動では触らず、導入せずに終了する（exit 1）
# - include を含む設定は読み込み先まで判定できないため、このリポジトリのログを対象にしていれば
#   退避せずに終了する。include 先に重複がある場合は、導入後の全体検証で見つけて元に戻す
#
# 全件を検査してから変更する。解消できない設定が1件でもあれば何も動かさない。
# 導入後は既存設定を含む全体（/etc/logrotate.conf）を logrotate -d で検証し、導入前に無かった
# エラー（duplicate log entry 等）が出たら、退避した設定と以前の seta-hp を元に戻す。
#
# テスト用に LOGROTATE_DIR / LOGROTATE_BACKUP_DIR / LOGROTATE_BIN / LOGROTATE_CONF で置き場所を差し替えられる。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE="$PROJECT_DIR/logrotate/seta-hp"
LOGROTATE_DIR="${LOGROTATE_DIR:-/etc/logrotate.d}"
BACKUP_DIR="${LOGROTATE_BACKUP_DIR:-/etc/logrotate.seta-hp-disabled}"
LOGROTATE_BIN="${LOGROTATE_BIN:-logrotate}"
LOGROTATE_CONF="${LOGROTATE_CONF:-/etc/logrotate.conf}"
TARGET="$LOGROTATE_DIR/seta-hp"

# このリポジトリがローテーションするログ
is_managed_path() {
  case "$1" in
    /var/log/nginx/*|/var/log/db-backup.log|/var/log/monitor.log|/var/log/certbot-renew.log) return 0 ;;
    *) return 1 ;;
  esac
}

# このリポジトリのログの実ファイル名。/var/log/*.log のように、ほかのログと一緒に
# ワイルドカードで拾っている設定を見つけるのに使う。
MANAGED_SAMPLES=(
  /var/log/nginx/access.log
  /var/log/nginx/error.log
  /var/log/db-backup.log
  /var/log/monitor.log
  /var/log/certbot-renew.log
)

overlaps_managed_logs() {
  local pattern="$1" sample
  for sample in "${MANAGED_SAMPLES[@]}"; do
    # shellcheck disable=SC2053 # 右辺はワイルドカードとして照合する
    [[ "$sample" == $pattern ]] && return 0
  done
  return 1
}

# logrotate 設定からローテーション対象のパスを1行1件で抜き出す。
# - 対象はブロック（{ ... }）の外に書かれたパス。ブロック内の指定（olddir 等）は数えない
# - "..." / '...' で囲んだパス（空白を含むものも）を1件として扱う
# - postrotate 等のスクリプト部分は、中の波かっこも含めて読み飛ばす
# - ブロック外で単語から始まる行（include 等の指定）は対象にしない
read -r -d '' TARGET_PATHS_AWK << 'AWK' || true
BEGIN { depth = 0; inscript = 0 }
{
  line = $0
  if (inscript) {
    if (line ~ /^[[:space:]]*endscript[[:space:]]*$/) inscript = 0
    next
  }
  if (depth > 0 && line ~ /^[[:space:]]*(postrotate|prerotate|firstaction|lastaction|preremove)([[:space:]]|$)/) {
    inscript = 1
    next
  }
  if (line ~ /^[[:space:]]*#/) next

  n = length(line)
  i = 1
  first = 1
  directive = 0
  while (i <= n) {
    c = substr(line, i, 1)
    if (c ~ /[[:space:]]/) { i++; continue }
    if (c == "{") { depth++; i++; continue }
    if (c == "}") { if (depth > 0) depth--; i++; continue }
    quoted = 0
    tok = ""
    if (c == "\"" || c == "'") {
      quoted = 1
      j = i + 1
      while (j <= n && substr(line, j, 1) != c) { tok = tok substr(line, j, 1); j++ }
      i = j + 1
    } else {
      j = i
      while (j <= n) {
        d = substr(line, j, 1)
        if (d ~ /[[:space:]]/ || d == "{" || d == "}") break
        tok = tok d
        j++
      }
      i = j
    }
    if (depth > 0) continue
    if (first && !quoted && tok !~ /^\//) directive = 1
    first = 0
    if (!directive) print tok
  }
}
AWK

target_paths() {
  awk "$TARGET_PATHS_AWK" "$1"
}

has_include() {
  grep -Eq '^[[:space:]]*include([[:space:]]|$)' "$1"
}

if [ ! -f "$SOURCE" ]; then
  echo "ERROR: $SOURCE が見つかりません" >&2
  exit 1
fi

# --- 1. 全件を検査する（ここでは何も変更しない） ---
mkdir -p "$LOGROTATE_DIR"
to_move=()
unresolved=0
for file in "$LOGROTATE_DIR"/*; do
  [ -f "$file" ] || continue
  [ "$file" = "$TARGET" ] && continue

  managed=0
  others=0
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    if is_managed_path "$path"; then
      managed=1
    elif overlaps_managed_logs "$path"; then
      # ワイルドカードでこのリポジトリのログもほかのログも拾っている
      managed=1
      others=1
    else
      others=1
    fi
  done < <(target_paths "$file")
  [ "$managed" -eq 1 ] || continue

  if has_include "$file"; then
    # 退避すると include で読み込んでいるほかのアプリの設定まで無効になる
    echo "  [エラー] $file は、このリポジトリのログを対象にし、include でほかの設定も読み込んでいます:" >&2
    grep -E '^[[:space:]]*include([[:space:]]|$)' "$file" | sed 's/^[[:space:]]*/    /' >&2
    unresolved=1
  elif [ "$others" -eq 0 ]; then
    to_move+=("$file")
  else
    echo "  [エラー] $file は、このリポジトリのログとほかのログをまとめて対象にしています:" >&2
    target_paths "$file" | sed 's/^/    /' >&2
    unresolved=1
  fi
done

if [ "$unresolved" -eq 1 ]; then
  echo "  二重ローテーションを避けるため、logrotate 設定は導入しませんでした（既存の設定も動かしていません）。" >&2
  echo "  上の設定から /var/log/nginx 等の行を外してから（include を含む設定は、その行を別ファイルに分けてから）、再度実行してください。" >&2
  exit 1
fi

# 導入する設定の構文を、何も動かす前に確かめる。
# logrotate はグループ・他人が書ける設定を無視するので、導入時と同じ 0644 で確かめる。
WORK_DIR="$(mktemp -d)"
check_syntax() {
  "$LOGROTATE_BIN" -d "$1" >/dev/null 2>&1 || {
    echo "ERROR: $1 の構文確認（logrotate -d）に失敗しました" >&2
    "$LOGROTATE_BIN" -d "$1" >&2 || true
    return 1
  }
}
install -m 0644 "$SOURCE" "$WORK_DIR/seta-hp"
if ! check_syntax "$WORK_DIR/seta-hp"; then
  rm -rf -- "$WORK_DIR"
  exit 1
fi

# 既存設定を含む全体の検証で出るエラー。導入前から出ているもの（ほかのアプリの設定の不備等）は
# 導入の成否と関係ないので、導入前と比べて新しく出たものだけを問題にする。
full_config_errors() {
  { "$LOGROTATE_BIN" -d "$LOGROTATE_CONF" 2>&1 || true; } | { grep '^error:' || true; } | sort -u
}
if [ ! -f "$LOGROTATE_CONF" ]; then
  echo "ERROR: 全体の設定 $LOGROTATE_CONF が見つかりません（導入後の検証ができないため中止します）" >&2
  rm -rf -- "$WORK_DIR"
  exit 1
fi
full_config_errors > "$WORK_DIR/errors-before"

# --- 2. 退避して導入する。途中で失敗したら元に戻す ---
moved_from=()
moved_to=()
had_target=0
if [ -f "$TARGET" ]; then
  cp -p "$TARGET" "$WORK_DIR/previous-seta-hp"
  had_target=1
fi
committed=0

rollback() {
  local i
  for ((i = ${#moved_from[@]} - 1; i >= 0; i--)); do
    mv -- "${moved_to[$i]}" "${moved_from[$i]}" \
      && echo "  退避した設定を元に戻しました: ${moved_from[$i]}" >&2 \
      || echo "  [警告] 元に戻せませんでした: ${moved_to[$i]} -> ${moved_from[$i]}" >&2
  done
  if [ "$had_target" -eq 1 ]; then
    cp -p "$WORK_DIR/previous-seta-hp" "$TARGET" || echo "  [警告] 以前の $TARGET を戻せませんでした" >&2
  else
    rm -f -- "$TARGET"
  fi
  echo "  logrotate 設定の導入に失敗したため、変更前の状態に戻しました。" >&2
}

finish() {
  local status=$?
  if [ "$committed" -eq 0 ]; then
    rollback
  fi
  rm -rf -- "$WORK_DIR"
  exit "$status"
}
trap finish EXIT

for file in ${to_move[@]+"${to_move[@]}"}; do
  mkdir -p "$BACKUP_DIR"
  dest="$BACKUP_DIR/$(basename "$file")"
  # 以前に退避したものがあれば上書きしない
  [ -e "$dest" ] && dest="$dest.$(date +%Y%m%d%H%M%S)"
  mv -- "$file" "$dest"
  moved_from+=("$file")
  moved_to+=("$dest")
  echo "  重複する設定を退避しました: $file -> $dest"
done

install -m 0644 "$SOURCE" "$TARGET"

# include 先の重複などは個別の判定では見つからないため、既存設定を含む全体で確かめる。
full_config_errors > "$WORK_DIR/errors-after"
comm -13 "$WORK_DIR/errors-before" "$WORK_DIR/errors-after" > "$WORK_DIR/errors-new"
if [ -s "$WORK_DIR/errors-new" ]; then
  echo "ERROR: 導入後、既存設定を含む全体の検証（logrotate -d $LOGROTATE_CONF）で新しいエラーが出ました:" >&2
  sed 's/^/    /' "$WORK_DIR/errors-new" >&2
  echo "  include 先などに同じログを対象にした設定がないか確認してください。" >&2
  exit 1
fi
committed=1
echo "  logrotate 設定を導入しました: $TARGET"
