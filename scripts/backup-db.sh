#!/bin/bash
# DBバックアップスクリプト（EC + Designer の両DB）
#
# Docker Composeのサービス環境変数をそのまま利用してmysqldumpし、認証情報の二重管理を避ける。
# 保持期間を過ぎたファイルをDBごとに削除するが、各DBの最新MIN_BACKUP_COUNT件は必ず残す。
#
# cron 設定例（毎日 4:00）:
#   0 4 * * * cd /home/ubuntu/seta-hp && ./scripts/backup-db.sh >> /var/log/db-backup.log 2>&1

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MIN_BACKUP_COUNT="${MIN_BACKUP_COUNT:-3}"
BACKUP_DESIGNER="${BACKUP_DESIGNER:-1}"
DESIGNER_PROJECT_DIR="${DESIGNER_PROJECT_DIR:-$(dirname "$PROJECT_DIR")/display_design}"
DESIGNER_ENV_FILE="${DESIGNER_ENV_FILE:-}"
DESIGNER_COMPOSE_FILE="${DESIGNER_COMPOSE_FILE:-}"
DESIGNER_DB_SERVICE="${DESIGNER_DB_SERVICE:-}"

# shellcheck source=scripts/lib/designer-compose.sh
. "$SCRIPT_DIR/lib/designer-compose.sh"

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ && "$MIN_BACKUP_COUNT" =~ ^[0-9]+$ ]]; then
  echo "RETENTION_DAYS と MIN_BACKUP_COUNT は0以上の整数で指定してください。" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
_ts() { date +%Y%m%d_%H%M%S; }
safe_name() { printf '%s' "$1" | tr -cd '[:alnum:]_-'; }
_fail=0

echo "=========================================="
echo "DBバックアップ開始: $(date)"
echo "=========================================="

# --- EC(HP) DB ---
(
  EC_DB="$(cd "$PROJECT_DIR" && docker compose -f docker-compose.yml exec -T mysql printenv MYSQL_DATABASE 2>/dev/null | tr -d '\r')"
  EC_DB="${EC_DB:-app_db}"
  OUT="$BACKUP_DIR/ec_$(safe_name "$EC_DB")_$(_ts).sql.gz"
  echo "[EC] ${EC_DB} を dump 中..."
  if (cd "$PROJECT_DIR" && docker compose -f docker-compose.yml exec -T mysql sh -c \
      'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump -u"$MYSQL_USER" --single-transaction --quick --lock-tables=false --no-tablespaces "$MYSQL_DATABASE"') \
      | gzip > "$OUT" && [ -s "$OUT" ]; then
    echo "[EC] OK: $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
  else
    echo "[EC] 失敗。空ファイルを削除。" >&2
    rm -f -- "$OUT"
    exit 1
  fi
) || _fail=1

# --- Designer DB ---
if [ "$BACKUP_DESIGNER" = "0" ]; then
  echo "[Designer] BACKUP_DESIGNER=0 のため明示的にスキップ"
else
  configure_designer_compose
  if [ ! -f "$DESIGNER_ENV_FILE" ] || [ ! -f "$DESIGNER_COMPOSE_FILE" ]; then
    echo "[Designer] envまたはComposeファイルがありません: $DESIGNER_ENV_FILE / $DESIGNER_COMPOSE_FILE" >&2
    _fail=1
  else
    if [ -z "$DESIGNER_DB_SERVICE" ]; then
      DESIGNER_DB_SERVICE="$(designer_compose config --services 2>/dev/null | awk '/^(designer-)?mysql$/{print; exit}')"
    fi

    if [ -z "$DESIGNER_DB_SERVICE" ]; then
      echo "[Designer] MySQLサービスをCompose設定から特定できません。" >&2
      _fail=1
    elif [ -z "$(designer_compose ps --status running -q "$DESIGNER_DB_SERVICE" 2>/dev/null)" ]; then
      echo "[Designer] MySQLサービス($DESIGNER_DB_SERVICE)が起動していません。" >&2
      _fail=1
    else
      (
        DES_DB="$(designer_compose exec -T "$DESIGNER_DB_SERVICE" printenv MYSQL_DATABASE 2>/dev/null | tr -d '\r')"
        DES_DB="${DES_DB:-kazalove}"
        OUT="$BACKUP_DIR/designer_$(safe_name "$DES_DB")_$(_ts).sql.gz"
        echo "[Designer] ${DES_DB} を dump 中..."
        if designer_compose exec -T "$DESIGNER_DB_SERVICE" sh -c \
            'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump -u"$MYSQL_USER" --single-transaction --quick --lock-tables=false --no-tablespaces "$MYSQL_DATABASE"' \
            | gzip > "$OUT" && [ -s "$OUT" ]; then
          echo "[Designer] OK: $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"
        else
          echo "[Designer] 失敗。空ファイルを削除。" >&2
          rm -f -- "$OUT"
          exit 1
        fi
      ) || _fail=1
    fi
  fi
fi

# --- 古いバックアップの削除（DB種別ごとに最新MIN_BACKUP_COUNT件を保護） ---
prune_backups() {
  local prefix="$1"
  local i candidate
  local -a files=()
  mapfile -t files < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${prefix}_*.sql.gz" -printf '%T@ %p\n' \
    | sort -nr | cut -d' ' -f2-)

  if [ "${#files[@]}" -le "$MIN_BACKUP_COUNT" ]; then
    echo "[$prefix] バックアップ数が${MIN_BACKUP_COUNT}件以下のため削除しません。"
    return
  fi

  for ((i = MIN_BACKUP_COUNT; i < ${#files[@]}; i++)); do
    candidate="${files[$i]}"
    if [ -n "$(find "$candidate" -mtime +"$RETENTION_DAYS" -print -quit 2>/dev/null)" ]; then
      echo "[$prefix] 期限切れを削除: $(basename "$candidate")"
      rm -f -- "$candidate"
    fi
  done
}

prune_backups ec
prune_backups designer

echo "現在のバックアップ一覧:"
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql.gz' -printf '%TY-%Tm-%Td %TH:%TM %10s %f\n' \
  | sort | tail -20 || true

echo "=========================================="
echo "DBバックアップ終了: $(date) (fail=${_fail})"
echo "=========================================="
exit "$_fail"
