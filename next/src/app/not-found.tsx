import { Box } from "@mui/material";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import PillLink from "@/components/PillLink";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

/**
 * 404 ページ。存在しない URL と notFound() の両方でここが表示される。
 * インタラクションなしのサーバーコンポーネント（#426）。
 */
export default function NotFound() {
  return (
    <PageHero
      eyebrow="404 Not Found"
      heading={
        <>
          ページが<em>見つかりません</em>
        </>
      }
      subtitle="— お探しのページは移動したか、削除された可能性があります。"
      description={
        <>
          URL をお確かめのうえ、商品一覧からお探しください。
          <br />
          ご不明な点は、お問い合わせからお気軽にどうぞ。
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: { xs: 3, md: 4 } }}>
            <PillLink href="/products" showArrow>
              商品一覧を見る
            </PillLink>
            <PillLink href="/contact">お問い合わせ</PillLink>
          </Box>
        </>
      }
    />
  );
}
