#!/bin/bash
# デプロイ後に古いアプリイメージを消す（deploy_production.yml から呼ばれる）。
#
# 使い方: cleanup-images.sh <repository> <keep> [保護するタグ...]
#   例:   cleanup-images.sh ghcr.io/seta-seisakusyo/seta-hp 3 "$IMAGE_TAG" "$PREV_TAG"
#
# - 世代はタグ数ではなく異なるイメージIDで数え、作成日時の新しい <keep> 個を残す
# - 保護するタグ（現行・直前の版）が付いたイメージは、世代に関係なく残す
# - 消すイメージは付いているタグを1つずつ外して消す（タグが残っている限り実体は消えない）。
#   ID 指定の docker rmi は複数タグの付いたイメージで失敗するため使わない
# - 失敗（コンテナが使用中など）は警告として出し、デプロイは止めない（常に exit 0）
set -uo pipefail

REPOSITORY="${1:?repository を指定してください}"
KEEP="${2:?保持する世代数を指定してください}"
shift 2
PROTECTED_TAGS=()
for tag in "$@"; do
  [ -n "$tag" ] && PROTECTED_TAGS+=("$tag")
done

is_protected_tag() {
  local tag="$1" protected
  for protected in "${PROTECTED_TAGS[@]+"${PROTECTED_TAGS[@]}"}"; do
    [ "$tag" = "$protected" ] && return 0
  done
  return 1
}

# ID<TAB>作成日時<TAB>タグ（同じ ID が複数タグの分だけ並ぶ）
listing="$(docker image ls "$REPOSITORY" --format '{{.ID}}	{{.CreatedAt}}	{{.Tag}}')" || {
  echo "WARN: イメージ一覧を取得できなかったため、古いイメージの削除を省略します"
  exit 0
}
[ -n "$listing" ] || { echo "削除対象のイメージはありません"; exit 0; }

# 作成日時の新しい順に、異なる ID を並べる
mapfile -t ordered_ids < <(printf '%s\n' "$listing" | sort -t $'\t' -k2,2r | awk -F'\t' '!seen[$1]++ { print $1 }')

declare -A keep_ids=()
for ((i = 0; i < ${#ordered_ids[@]} && i < KEEP; i++)); do
  keep_ids["${ordered_ids[$i]}"]=1
done
while IFS=$'\t' read -r id _created tag; do
  is_protected_tag "$tag" && keep_ids["$id"]=1
done <<< "$listing"

removed=0
failed=0
for id in "${ordered_ids[@]}"; do
  [ -n "${keep_ids[$id]:-}" ] && continue
  while IFS=$'\t' read -r row_id _created tag; do
    [ "$row_id" = "$id" ] || continue
    # タグの無いイメージ（<none>）は ID で消す
    if [ "$tag" = "<none>" ]; then ref="$id"; else ref="$REPOSITORY:$tag"; fi
    if docker rmi "$ref" >/dev/null 2>&1; then
      echo "  removed: $ref"
      removed=$((removed + 1))
    else
      echo "  WARN: $ref を削除できませんでした（使用中の可能性があります）"
      failed=$((failed + 1))
    fi
  done <<< "$listing"
done

echo "古いイメージの削除: ${#keep_ids[@]} 件保持 / ${removed} 件のタグを削除 / ${failed} 件失敗"
exit 0
