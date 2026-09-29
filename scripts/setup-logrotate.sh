#!/bin/bash
# logrotate/seta-hp を /etc/logrotate.d/seta-hp へ導入する（setup-monitoring.sh から呼ばれる）。
#
# 同じログを対象にした既存設定があると二重にローテーションされるため、導入前に解消する。
# - 既存設定が「このリポジトリが扱うログだけ」を対象にしている（例: nginx パッケージ既定の
#   /etc/logrotate.d/nginx）なら、/etc/logrotate.d の外へ退避してから導入する
# - ほかのログも対象にしている設定は自動では触らず、導入せずに終了する（exit 1）
#
# テスト用に LOGROTATE_DIR / LOGROTATE_BACKUP_DIR / LOGROTATE_BIN で置き場所を差し替えられる。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE="$PROJECT_DIR/logrotate/seta-hp"
LOGROTATE_DIR="${LOGROTATE_DIR:-/etc/logrotate.d}"
BACKUP_DIR="${LOGROTATE_BACKUP_DIR:-/etc/logrotate.seta-hp-disabled}"
LOGROTATE_BIN="${LOGROTATE_BIN:-logrotate}"
TARGET="$LOGROTATE_DIR/seta-hp"

# このリポジトリがローテーションするログ
is_managed_path() {
  case "$1" in
    /var/log/nginx/*|/var/log/db-backup.log|/var/log/monitor.log|/var/log/certbot-renew.log) return 0 ;;
    *) return 1 ;;
  esac
}

# logrotate 設定からローテーション対象のパスを抜き出す（postrotate 等のスクリプト部分は除く）。
target_paths() {
  awk '
    /^[[:space:]]*(postrotate|prerotate|firstaction|lastaction|preremove)[[:space:]]*$/ { inscript = 1; next }
    /^[[:space:]]*endscript[[:space:]]*$/ { inscript = 0; next }
    inscript { next }
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/\{.*/, "", line)
      n = split(line, words, /[[:space:]]+/)
      for (i = 1; i <= n; i++) if (words[i] ~ /^\//) print words[i]
    }
  ' "$1"
}

if [ ! -f "$SOURCE" ]; then
  echo "ERROR: $SOURCE が見つかりません" >&2
  exit 1
fi

mkdir -p "$LOGROTATE_DIR"
unresolved=0
for file in "$LOGROTATE_DIR"/*; do
  [ -f "$file" ] || continue
  [ "$file" = "$TARGET" ] && continue

  managed=0
  others=0
  while IFS= read -r path; do
    if is_managed_path "$path"; then managed=1; else others=1; fi
  done < <(target_paths "$file")
  [ "$managed" -eq 1 ] || continue

  if [ "$others" -eq 0 ]; then
    mkdir -p "$BACKUP_DIR"
    mv "$file" "$BACKUP_DIR/"
    echo "  重複する設定を退避しました: $file -> $BACKUP_DIR/"
  else
    echo "  [エラー] $file は、このリポジトリのログとほかのログをまとめて対象にしています:" >&2
    target_paths "$file" | sed 's/^/    /' >&2
    unresolved=1
  fi
done

if [ "$unresolved" -eq 1 ]; then
  echo "  二重ローテーションを避けるため、logrotate 設定は導入しませんでした。" >&2
  echo "  上の設定から /var/log/nginx 等の行を外してから、再度実行してください。" >&2
  exit 1
fi

install -m 0644 "$SOURCE" "$TARGET"
"$LOGROTATE_BIN" -d "$TARGET" >/dev/null 2>&1 || {
  echo "ERROR: $TARGET の構文確認（logrotate -d）に失敗しました" >&2
  "$LOGROTATE_BIN" -d "$TARGET" >&2 || true
  exit 1
}
echo "  logrotate 設定を導入しました: $TARGET"
