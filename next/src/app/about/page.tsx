import type { Metadata } from "next";
import AboutHero from "./_components/AboutHero";
import AboutStory from "./_components/AboutStory";
import AboutCollector from "./_components/AboutCollector";
import AboutValues from "./_components/AboutValues";
import AboutFeatures from "./_components/AboutFeatures";
import DarkCtaSection from "@/components/DarkCtaSection";
import { buildPageMetadata } from "@/lib/metadata";

// 非公開扱い（#312）。ヘッダー・フッターの導線と sitemap から外し、
// 検索にも載せない。ページ自体は残してあるのでURL直打ちでは表示される。
export const metadata: Metadata = buildPageMetadata({
  title: "工房について",
  description:
    "飾Love は、MLBカードコレクターが一人で運営する小さな工房。レーザー加工で、コレクターが本当に欲しいアクリルディスプレイを一つずつ手作りしています。",
  path: "/about",
  noindex: true,
});

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutStory />
      <AboutCollector />
      <AboutValues />
      <AboutFeatures />
      <DarkCtaSection
        heading={<><em>飾りたい気持ちを、</em><br />かたちにします。</>}
        body="お手持ちのカード、飾る場所、理想の見せ方をお聞かせください。コレクター目線で一緒に考えます。"
        primaryLabel="制作の相談をする"
        secondaryHref="/gallery"
        secondaryLabel="制作事例を見る"
      />
    </>
  );
}
