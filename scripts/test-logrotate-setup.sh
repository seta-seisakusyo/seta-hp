#!/bin/bash
# logrotate/seta-hp の構文と scripts/setup-logrotate.sh の重複解消を検証する（CI で実行）。
# 本物の logrotate が必要（CI では apt で入れる）。/etc には触らず一時ディレクトリで動かす。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TMP_DIR"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }

command -v logrotate >/dev/null || fail "logrotate が見つかりません"

# 0. 設定そのものの構文（-d は実際には回さない）。
#    logrotate はグループ・他人が書ける設定を無視するので、導入時と同じ 0644 で確かめる。
install -m 0644 "$PROJECT_DIR/logrotate/seta-hp" "$TMP_DIR/seta-hp.conf"
logrotate -d "$TMP_DIR/seta-hp.conf" > "$TMP_DIR/syntax.txt" 2>&1 \
  || { cat "$TMP_DIR/syntax.txt" >&2; fail "logrotate/seta-hp の構文エラー"; }
grep -q "rotating pattern: /var/log/nginx/\*.log" "$TMP_DIR/syntax.txt" \
  || fail "Nginx ログが対象になっていません"
grep -q "rotating pattern: /var/log/db-backup.log /var/log/monitor.log /var/log/certbot-renew.log" "$TMP_DIR/syntax.txt" \
  || fail "運用ログが対象になっていません"
echo "ok - logrotate/seta-hp の構文"

setup() {
  local case_dir="$TMP_DIR/$1"
  mkdir -p "$case_dir/logrotate.d"
  shift
  LOGROTATE_DIR="$case_dir/logrotate.d" LOGROTATE_BACKUP_DIR="$case_dir/disabled" \
    bash "$SCRIPT_DIR/setup-logrotate.sh" "$@"
}

# 1. 重複が無ければそのまま導入する。無関係な設定は触らない。
mkdir -p "$TMP_DIR/clean/logrotate.d"
printf '/var/log/apt/term.log {\n  rotate 12\n}\n' > "$TMP_DIR/clean/logrotate.d/apt"
setup clean > /dev/null
[ -f "$TMP_DIR/clean/logrotate.d/seta-hp" ] || fail "導入されていません"
[ -f "$TMP_DIR/clean/logrotate.d/apt" ] || fail "無関係な設定が消えています"
echo "ok - 重複が無ければ導入する"

# 2. nginx パッケージ既定のように同じログだけを対象にした設定は退避してから導入する。
mkdir -p "$TMP_DIR/dup/logrotate.d"
cat > "$TMP_DIR/dup/logrotate.d/nginx" << 'EOF'
/var/log/nginx/*.log {
	daily
	rotate 14
	postrotate
		invoke-rc.d nginx rotate >/dev/null 2>&1 /var/log/other.log
	endscript
}
EOF
setup dup > /dev/null
[ ! -e "$TMP_DIR/dup/logrotate.d/nginx" ] || fail "重複する設定が残っています"
[ -f "$TMP_DIR/dup/disabled/nginx" ] || fail "重複する設定が退避されていません"
[ -f "$TMP_DIR/dup/logrotate.d/seta-hp" ] || fail "導入されていません"
echo "ok - 同じログだけを対象にした設定は退避して導入する（postrotate 内のパスは対象に数えない）"

# 3. ほかのログもまとめて対象にした設定があれば、導入せずに失敗する。
mkdir -p "$TMP_DIR/mixed/logrotate.d"
printf '/var/log/monitor.log /var/log/syslog-extra.log {\n  weekly\n}\n' > "$TMP_DIR/mixed/logrotate.d/custom"
if setup mixed > "$TMP_DIR/mixed.txt" 2>&1; then
  fail "解消できない重複があるのに成功しています"
fi
[ ! -e "$TMP_DIR/mixed/logrotate.d/seta-hp" ] || fail "解消できない重複があるのに導入されています"
[ -f "$TMP_DIR/mixed/logrotate.d/custom" ] || fail "ほかのログを含む設定を勝手に動かしています"
grep -q "custom" "$TMP_DIR/mixed.txt" || fail "重複している設定の場所が表示されていません"
echo "ok - ほかのログを含む重複設定があれば導入しない"

# 4. 再実行しても自分自身を重複として扱わない。
setup clean > /dev/null
[ -f "$TMP_DIR/clean/logrotate.d/seta-hp" ] || fail "再実行で導入が消えています"
echo "ok - 再実行できる"

echo "setup-logrotate.sh: all tests passed"
