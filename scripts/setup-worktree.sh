#!/bin/bash
# git worktree でコード作業（lint / typecheck / test / 編集）を始めるための初期化。
#
# worktree には gitignore 対象のローカル資産（.env 等）が引き継がれないため、
# メイン作業ツリーからコピーして揃える。
#
# 使い方:
#   git worktree add ../seta-hp-<name> -b <branch>
#   cd ../seta-hp-<name> && bash scripts/setup-worktree.sh
#
# オプション:
#   --install   next/ で yarn install も実行する（既定はスキップ。数分かかるため）

set -euo pipefail

RUN_INSTALL=0
for arg in "$@"; do
    case "$arg" in
        --install) RUN_INSTALL=1 ;;
        *) echo "不明なオプション: $arg" >&2; exit 1 ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKTREE_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$WORKTREE_ROOT"

# メイン作業ツリー = .git ディレクトリの実体があるディレクトリ。
# worktree 側の .git はファイル(gitdir: ...)なので、common-dir から逆引きする。
GIT_COMMON_DIR="$(git rev-parse --git-common-dir)"
MAIN_ROOT="$(cd "$(dirname "$GIT_COMMON_DIR")" && pwd)"

echo "=========================================="
echo "worktree 初期化"
echo "=========================================="
echo "  worktree : $WORKTREE_ROOT"
echo "  メイン    : $MAIN_ROOT"
echo "  ブランチ  : $(git branch --show-current)"
echo ""

if [ "$MAIN_ROOT" = "$WORKTREE_ROOT" ]; then
    echo "ここはメイン作業ツリーです。初期化は不要です。"
    exit 0
fi

# ----------------------------------
# 1. gitignore 対象のローカル設定をコピー
# ----------------------------------
echo "1. ローカル設定をコピー中..."
for f in .env next/.env; do
    src="$MAIN_ROOT/$f"
    dst="$WORKTREE_ROOT/$f"
    if [ ! -f "$src" ]; then
        echo "  - $f: メイン側に存在しないためスキップ"
    elif [ -f "$dst" ]; then
        echo "  - $f: 既に存在するため保持（上書きしない）"
    else
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
        echo "  ✓ $f をコピー"
    fi
done

# ----------------------------------
# 2. 依存関係
# ----------------------------------
echo ""
echo "2. 依存関係を確認中..."
if [ -d "$WORKTREE_ROOT/next/node_modules" ]; then
    echo "  ✓ next/node_modules は既に存在"
elif [ "$RUN_INSTALL" -eq 1 ]; then
    echo "  yarn install を実行します（数分かかります）..."
    (cd "$WORKTREE_ROOT/next" && yarn install --frozen-lockfile)
    echo "  ✓ 完了"
else
    echo "  ✗ next/node_modules がありません。lint/typecheck/test の前に実行してください:"
    echo "      cd next && yarn install --frozen-lockfile"
    echo "    （このスクリプトに --install を付けると自動実行します）"
fi

echo ""
echo "=========================================="
echo "初期化完了"
echo "=========================================="
echo ""
echo "この worktree でできること:"
echo "  cd next && yarn lint / yarn test"
echo "  cd next && yarn build && yarn typecheck   # typecheck は .next の再生成が必要"
echo ""
echo "【重要】Docker スタックはこの worktree から起動しないでください。"
echo "  docker-compose.yml が container_name (next_app / mysql_db / nginx_proxy) と"
echo "  ポート (3001 / 2999 / 80 / 443) を固定しているため、メイン作業ツリーの"
echo "  コンテナと衝突します。動作確認はメイン ($MAIN_ROOT) で行ってください。"
