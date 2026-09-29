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
# 設定の "su root adm" は root 以外だと -d でもユーザーを切り替えられず失敗する（本番も sudo で導入する）
[ "$(id -u)" -eq 0 ] || fail "root で実行してください（例: sudo bash $0）"

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

# 0b. Ubuntu の /var/log と同じく、親ディレクトリがグループ書き込み可（root 以外のグループ）でも
#     単独の構文確認が通る（#342）。/var/log には触れないので、パスを一時ディレクトリへ置き換えて確かめる。
LOGDIR="$TMP_DIR/varlog"
mkdir -p "$LOGDIR/nginx"
touch "$LOGDIR/nginx/access.log" "$LOGDIR/db-backup.log" "$LOGDIR/monitor.log" "$LOGDIR/certbot-renew.log"
chgrp adm "$LOGDIR" "$LOGDIR/nginx"
chmod 0775 "$LOGDIR" "$LOGDIR/nginx"
[ "$(stat -c %g "$LOGDIR")" -ne 0 ] || fail "テスト用ディレクトリのグループを root 以外にできません"
sed "s#/var/log/#$LOGDIR/#g" "$PROJECT_DIR/logrotate/seta-hp" > "$TMP_DIR/perm.conf"
chmod 0644 "$TMP_DIR/perm.conf"
logrotate -d "$TMP_DIR/perm.conf" > "$TMP_DIR/perm.txt" 2>&1 \
  || { cat "$TMP_DIR/perm.txt" >&2; fail "グループ書き込み可のディレクトリで構文確認が失敗します"; }
# su を外すと同じ条件で失敗すること（このテストが本番の状況を再現できていること）も確かめる
grep -v '^[[:space:]]*su ' "$TMP_DIR/perm.conf" > "$TMP_DIR/perm-nosu.conf"
chmod 0644 "$TMP_DIR/perm-nosu.conf"
if logrotate -d "$TMP_DIR/perm-nosu.conf" > "$TMP_DIR/perm-nosu.txt" 2>&1; then
  fail "su なしでも通ってしまい、グループ書き込み可の状況を再現できていません"
fi
grep -q "insecure permissions" "$TMP_DIR/perm-nosu.txt" || { cat "$TMP_DIR/perm-nosu.txt" >&2; fail "想定と違う理由で失敗しています"; }
echo "ok - 親ディレクトリがグループ書き込み可でも構文確認が通る（su root adm）"

setup() {
  local case_dir="$TMP_DIR/$1"
  mkdir -p "$case_dir/logrotate.d"
  # /etc/logrotate.conf の代わり。導入後の全体検証はこれを使う
  [ -f "$case_dir/logrotate.conf" ] || printf 'include %s/logrotate.d\n' "$case_dir" > "$case_dir/logrotate.conf"
  shift
  LOGROTATE_DIR="$case_dir/logrotate.d" LOGROTATE_BACKUP_DIR="$case_dir/disabled" \
    LOGROTATE_CONF="$case_dir/logrotate.conf" \
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

# 5. 引用符で囲んだパスも対象として数える（ほかのアプリのログを見落として退避しない）。
mkdir -p "$TMP_DIR/quoted/logrotate.d"
cat > "$TMP_DIR/quoted/logrotate.d/otherapp" << 'EOF'
"/var/log/nginx/access.log" "/var/log/otherapp/app.log" {
  weekly
}
EOF
cat > "$TMP_DIR/quoted/logrotate.d/spaced" << 'EOF'
'/var/log/my app/app.log'
/var/log/monitor.log
{
  weekly
}
EOF
if setup quoted > "$TMP_DIR/quoted.txt" 2>&1; then
  fail "引用符付きのほかのログを含む設定があるのに成功しています"
fi
[ -f "$TMP_DIR/quoted/logrotate.d/otherapp" ] || fail "引用符付きのほかのログを含む設定を退避しています"
[ -f "$TMP_DIR/quoted/logrotate.d/spaced" ] || fail "空白を含むパスの設定を退避しています"
grep -q "/var/log/otherapp/app.log" "$TMP_DIR/quoted.txt" || fail "引用符付きのパスが表示されていません"
grep -q "/var/log/my app/app.log" "$TMP_DIR/quoted.txt" || fail "空白を含むパスが1件として表示されていません"
[ ! -e "$TMP_DIR/quoted/logrotate.d/seta-hp" ] || fail "解消できない重複があるのに導入されています"

mkdir -p "$TMP_DIR/quoted-only/logrotate.d"
printf '"/var/log/nginx/*.log" {\n  daily\n}\n' > "$TMP_DIR/quoted-only/logrotate.d/nginx"
setup quoted-only > /dev/null
[ -f "$TMP_DIR/quoted-only/disabled/nginx" ] || fail "引用符付きで同じログだけを対象にした設定が退避されていません"
echo "ok - 引用符付き・空白を含むパスを正しく数える"

# 6. ワイルドカードでこのリポジトリのログも拾う設定は、ほかのログを含む重複として扱う。
#    ブロック内の指定（olddir 等）やブロック外の include はローテーション対象に数えない。
mkdir -p "$TMP_DIR/glob/logrotate.d"
printf '/var/log/*.log {\n  weekly\n}\n' > "$TMP_DIR/glob/logrotate.d/everything"
printf 'include /var/log/nginx\n/var/log/apt/history.log {\n  olddir /var/log/nginx/old\n}\n' > "$TMP_DIR/glob/logrotate.d/apt"
if setup glob > "$TMP_DIR/glob.txt" 2>&1; then
  fail "/var/log/*.log の設定があるのに成功しています"
fi
[ -f "$TMP_DIR/glob/logrotate.d/everything" ] || fail "ワイルドカードの設定を退避しています"
grep -q "everything" "$TMP_DIR/glob.txt" || fail "ワイルドカードの設定が表示されていません"
if grep -q "logrotate.d/apt" "$TMP_DIR/glob.txt"; then
  fail "ブロック内の olddir や include をローテーション対象として数えています"
fi
echo "ok - ワイルドカードでの重複を見つけ、ブロック内の指定は数えない"

# 7. 解消できない設定が後ろにあっても、先に見つけた重複を退避しない（全件を検査してから動かす）。
mkdir -p "$TMP_DIR/order/logrotate.d"
printf '/var/log/nginx/*.log {\n  daily\n}\n' > "$TMP_DIR/order/logrotate.d/a-nginx"
printf '/var/log/monitor.log /var/log/syslog-extra.log {\n  weekly\n}\n' > "$TMP_DIR/order/logrotate.d/z-custom"
if setup order > /dev/null 2>&1; then
  fail "解消できない重複があるのに成功しています"
fi
[ -f "$TMP_DIR/order/logrotate.d/a-nginx" ] || fail "導入しないのに重複する設定を退避したままです"
[ ! -e "$TMP_DIR/order/disabled/a-nginx" ] || fail "導入しないのに退避先に設定が残っています"
[ ! -e "$TMP_DIR/order/logrotate.d/seta-hp" ] || fail "解消できない重複があるのに導入されています"
echo "ok - 解消できない重複があれば、ほかの設定も動かさない"

# 8. 導入後の確認に失敗したら、退避した設定と以前の seta-hp を元に戻す。
#    1回目（単体の構文確認）と2回目（導入前の全体検証）は成功し、3回目（導入後の全体検証）で
#    エラーを出す logrotate を使う。
mkdir -p "$TMP_DIR/rollback/logrotate.d" "$TMP_DIR/rollback/bin"
printf '/var/log/nginx/*.log {\n  daily\n}\n' > "$TMP_DIR/rollback/logrotate.d/nginx"
printf 'previous config\n' > "$TMP_DIR/rollback/logrotate.d/seta-hp"
cat > "$TMP_DIR/rollback/bin/logrotate" << EOF
#!/bin/bash
count_file="$TMP_DIR/rollback/count"
count=\$(( \$(cat "\$count_file" 2>/dev/null || echo 0) + 1 ))
echo "\$count" > "\$count_file"
if [ "\$count" -ge 3 ]; then
  echo "error: fake failure" >&2
  exit 1
fi
EOF
chmod +x "$TMP_DIR/rollback/bin/logrotate"
if LOGROTATE_BIN="$TMP_DIR/rollback/bin/logrotate" setup rollback > "$TMP_DIR/rollback.txt" 2>&1; then
  fail "導入後の確認に失敗したのに成功しています"
fi
[ -f "$TMP_DIR/rollback/logrotate.d/nginx" ] || fail "退避した設定が元に戻っていません"
[ ! -e "$TMP_DIR/rollback/disabled/nginx" ] || fail "退避先に設定が残っています"
[ "$(cat "$TMP_DIR/rollback/logrotate.d/seta-hp")" = "previous config" ] || fail "以前の seta-hp が戻っていません"
echo "ok - 導入に失敗したら変更前の状態に戻す"

# 9. 以前に退避したものがあっても上書きしない。
mkdir -p "$TMP_DIR/again/logrotate.d" "$TMP_DIR/again/disabled"
printf 'first backup\n' > "$TMP_DIR/again/disabled/nginx"
printf '/var/log/nginx/*.log {\n  daily\n}\n' > "$TMP_DIR/again/logrotate.d/nginx"
setup again > /dev/null
[ "$(cat "$TMP_DIR/again/disabled/nginx")" = "first backup" ] || fail "以前の退避を上書きしています"
[ "$(find "$TMP_DIR/again/disabled" -name 'nginx.*' | wc -l)" -eq 1 ] || fail "新しい退避が別名で残っていません"
echo "ok - 以前の退避を上書きしない"

# 10. include でほかのアプリの設定を読み込み、同じファイルに Nginx の設定もある場合は退避しない
#     （退避すると include 先のローテーションまで無効になる）。
mkdir -p "$TMP_DIR/incl-same/logrotate.d" "$TMP_DIR/incl-same/otherapp.d"
printf '/var/log/otherapp/app.log {\n  weekly\n  missingok\n}\n' > "$TMP_DIR/incl-same/otherapp.d/otherapp"
printf 'include %s/incl-same/otherapp.d\n/var/log/nginx/*.log {\n  daily\n}\n' "$TMP_DIR" > "$TMP_DIR/incl-same/logrotate.d/combined"
if setup incl-same > "$TMP_DIR/incl-same.txt" 2>&1; then
  fail "include を含む重複設定があるのに成功しています"
fi
[ -f "$TMP_DIR/incl-same/logrotate.d/combined" ] || fail "include を含む設定を退避しています"
[ ! -e "$TMP_DIR/incl-same/logrotate.d/seta-hp" ] || fail "include を含む重複があるのに導入されています"
grep -q "include" "$TMP_DIR/incl-same.txt" || fail "include が原因であることが表示されていません"
echo "ok - include を含む重複設定は退避せずに止める"

# 11. Nginx の設定が include 先にあって個別の判定で見つからなくても、導入後の全体検証
#     （duplicate log entry）で見つけ、導入をやめて元に戻す。
mkdir -p "$TMP_DIR/incl-dup/logrotate.d" "$TMP_DIR/incl-dup/nginx.d"
printf '/var/log/nginx/*.log {\n  daily\n  missingok\n}\n' > "$TMP_DIR/incl-dup/nginx.d/nginx"
printf 'include %s/incl-dup/nginx.d\n' "$TMP_DIR" > "$TMP_DIR/incl-dup/logrotate.d/loader"
if setup incl-dup > "$TMP_DIR/incl-dup.txt" 2>&1; then
  cat "$TMP_DIR/incl-dup.txt" >&2
  fail "include 先に重複があるのに成功しています"
fi
[ ! -e "$TMP_DIR/incl-dup/logrotate.d/seta-hp" ] || fail "include 先に重複があるのに導入したままです"
[ -f "$TMP_DIR/incl-dup/logrotate.d/loader" ] || fail "include を含む設定を動かしています"
grep -q "duplicate log entry" "$TMP_DIR/incl-dup.txt" || fail "全体検証のエラーが表示されていません"
echo "ok - include 先の重複は導入後の全体検証で見つけて元に戻す"

# 12. 導入前から出ているエラー（ほかのアプリの設定の不備）は、導入を妨げない。
mkdir -p "$TMP_DIR/preexisting/logrotate.d"
printf '/var/log/otherapp/missing.log {\n  weekly\n}\n' > "$TMP_DIR/preexisting/logrotate.d/otherapp"
printf 'this is not a valid directive\n' > "$TMP_DIR/preexisting/logrotate.d/broken"
setup preexisting > "$TMP_DIR/preexisting.txt" 2>&1 \
  || { cat "$TMP_DIR/preexisting.txt" >&2; fail "導入前からあるエラーで導入が止まっています"; }
[ -f "$TMP_DIR/preexisting/logrotate.d/seta-hp" ] || fail "導入されていません"
echo "ok - 導入前からあるエラーは導入を妨げない"

echo "setup-logrotate.sh: all tests passed"
