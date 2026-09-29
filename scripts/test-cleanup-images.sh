#!/bin/bash
# scripts/cleanup-images.sh を偽の docker コマンドで検証する（CI で実行）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf -- "$TMP_DIR"' EXIT

REPO="ghcr.io/example/seta-hp"
BIN="$TMP_DIR/bin"
mkdir -p "$BIN"
export FAKE_LISTING="$TMP_DIR/listing.tsv"
export FAKE_RMI_LOG="$TMP_DIR/rmi.log"
export FAKE_RMI_FAIL=""
export FAKE_LS_FAIL=""

# image ls は $FAKE_LISTING を返し、rmi は引数を $FAKE_RMI_LOG に記録する。
cat > "$BIN/docker" << 'EOF'
#!/bin/bash
if [ "$1" = "image" ] && [ "$2" = "ls" ]; then
  [ -n "$FAKE_LS_FAIL" ] && exit 1
  cat "$FAKE_LISTING"
  exit 0
fi
if [ "$1" = "rmi" ]; then
  echo "$2" >> "$FAKE_RMI_LOG"
  [ "$2" = "$FAKE_RMI_FAIL" ] && exit 1
  exit 0
fi
echo "unexpected docker call: $*" >&2
exit 2
EOF
chmod +x "$BIN/docker"

run_cleanup() {
  : > "$FAKE_RMI_LOG"
  PATH="$BIN:$PATH" bash "$SCRIPT_DIR/cleanup-images.sh" "$REPO" 3 "$@"
}

fail() { echo "FAIL: $*" >&2; exit 1; }

assert_removed() {
  local expected
  expected="$(printf '%s\n' "$@" | sort)"
  local actual
  actual="$(sort "$FAKE_RMI_LOG")"
  [ "$actual" = "$expected" ] || fail "削除されたタグが想定と違います
--- 期待
$expected
--- 実際
$actual"
}

TAB=$'\t'
{
  echo "aaa${TAB}2026-09-28 10:00:00 +0900 JST${TAB}sha-current"
  echo "aaa${TAB}2026-09-28 10:00:00 +0900 JST${TAB}latest"
  echo "bbb${TAB}2026-09-27 10:00:00 +0900 JST${TAB}sha-b"
  echo "ccc${TAB}2026-09-26 10:00:00 +0900 JST${TAB}sha-c"
  echo "ddd${TAB}2026-09-25 10:00:00 +0900 JST${TAB}sha-d1"
  echo "ddd${TAB}2026-09-25 10:00:00 +0900 JST${TAB}sha-d2"
  echo "eee${TAB}2026-09-24 10:00:00 +0900 JST${TAB}sha-previous"
  echo "fff${TAB}2026-09-23 10:00:00 +0900 JST${TAB}<none>"
  echo "ggg${TAB}2026-09-22 10:00:00 +0900 JST${TAB}sha-g"
} > "$FAKE_LISTING"

# 1. 異なるIDで新しい3世代（aaa・bbb・ccc）＋直前の版（eee）を残し、残りをタグ単位で消す。
#    aaa は2タグだが1世代として数える。<none> は ID で消す。
run_cleanup sha-current sha-previous > "$TMP_DIR/out.txt"
assert_removed "$REPO:sha-d1" "$REPO:sha-d2" "fff" "$REPO:sha-g"
echo "ok - 3世代＋現行・直前の版を残し、複数タグのイメージはタグごとに消す"

# 2. 削除に失敗しても続行し、警告を出して exit 0 で終わる。
FAKE_RMI_FAIL="$REPO:sha-d1" run_cleanup sha-current sha-previous > "$TMP_DIR/out.txt"
assert_removed "$REPO:sha-d1" "$REPO:sha-d2" "fff" "$REPO:sha-g"
grep -q "WARN: $REPO:sha-d1" "$TMP_DIR/out.txt" || fail "削除失敗の警告が出ていません"
echo "ok - 削除に失敗しても止まらず警告を出す"

# 3. 直前の版の指定が空（初回デプロイ）でも動き、保護は現行だけになる。
run_cleanup sha-current "" > "$TMP_DIR/out.txt"
assert_removed "$REPO:sha-d1" "$REPO:sha-d2" "$REPO:sha-previous" "fff" "$REPO:sha-g"
echo "ok - 直前の版が無くても動く"

# 4. 3世代以内なら何も消さない。
head -n 4 "$FAKE_LISTING" > "$TMP_DIR/short.tsv" && cp "$TMP_DIR/short.tsv" "$FAKE_LISTING"
run_cleanup sha-current "" > "$TMP_DIR/out.txt"
assert_removed
echo "ok - 3世代以内なら何も消さない"

# 5. 一覧を取得できなければ何も消さずに exit 0。
FAKE_LS_FAIL=1 run_cleanup sha-current "" > "$TMP_DIR/out.txt"
assert_removed
echo "ok - 一覧の取得に失敗したら何も消さない"

echo "cleanup-images.sh: all tests passed"
