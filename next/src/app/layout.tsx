import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ReviewOverlay from "@/components/ReviewOverlay";
import Analytics from "@/components/Analytics";
import theme from "@/theme/theme";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE,
  FAVICON_PATH,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_READING,
  SITE_URL,
} from "@/lib/site-config";
import JsonLd from "@/components/JsonLd";
import { buildOrganizationJsonLd } from "@/lib/structured-data";
import { Cormorant_Garamond, Inter, Inter_Tight, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 実際に使用しているウェイトのみ読み込む（転送量削減 #245）。
// 300 は未使用、800 は display フォント（Inter Tight）のみで使用。
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-inter-tight",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// 和文フォントは1ウェイトが最重量のため未使用の 300 を削除（転送量削減 #245）
const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  // ここにはサイト共通の既定値だけを置く。canonical・og:url・og:title などページ固有の値は
  // 各ページが buildPageMetadata（src/lib/metadata.ts）で出す（#417）。
  // ここで指定すると、指定していないページがトップの値を引き継いでしまう。
  description: SITE_DESCRIPTION,
  keywords: [
    "MLBカード",
    "野球カード",
    "大谷翔平",
    "Topps",
    "トレカディスプレイ",
    "アクリルディスプレイ",
    "壁面ディスプレイ",
    "カードコレクション",
    "AWARD HISTORY",
    SITE_NAME,
    SITE_NAME_READING,
    "トレカ",
    "ドジャース",
    "ハンドメイド",
  ],

  metadataBase: new URL(SITE_URL),

  icons: {
    icon: FAVICON_PATH,
    apple: FAVICON_PATH,
  },

  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${interTight.variable} ${cormorant.variable} ${notoJp.variable}`}
    >
      <head>
        <JsonLd data={buildOrganizationJsonLd()} />
      </head>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {/* ネイティブスクロールを使用（simplebar-react は #245 で撤去、スクロールバーは globals.css で非表示）。
                position: relative は ReviewOverlay のピン (position: absolute) の基準 */}
            <div style={{ position: "relative", minHeight: "100vh" }}>
              <Header />
              {children}
              <Footer />
              {process.env.NEXT_PUBLIC_ENABLE_COMMENTS === "true" && <ReviewOverlay />}
            </div>
            <Analytics />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
