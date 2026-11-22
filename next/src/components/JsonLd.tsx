import { serializeJsonLd } from "@/lib/json-ld";

/**
 * 構造化データ（JSON-LD）を <script type="application/ld+json"> として埋め込む。
 * serializeJsonLd で `<` などをエスケープし、データ中の `</script>` でタグが閉じないようにする。
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
