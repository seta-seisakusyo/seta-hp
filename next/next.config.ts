import type { NextConfig } from "next";

const securityHeaders = [
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
    },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.recaptcha.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://kaza-love.com https://www.kaza-love.com https://setaseisakusyo.com https://*.googleusercontent.com",
            "frame-src https://www.google.com https://www.recaptcha.net",
            "connect-src 'self' https://www.google.com https://www.recaptcha.net",
        ].join("; "),
    },
];

const nextConfig: NextConfig = {
    output: "standalone",
    // sharp はネイティブ依存のため Next にバンドルさせず外部解決させる（#196）。
    serverExternalPackages: ["sharp"],
    images: {
        // AVIF を優先して配信し転送量を削減（非対応ブラウザは WebP にフォールバック）。
        formats: ["image/avif", "image/webp"],
        // アップロード画像は一意なファイル名で実質不変なため長期キャッシュにする（#196）。
        minimumCacheTTL: 31536000,
        // localPatterns は指定しない（＝ローカル画像を全許可するデフォルトのまま）。
        // かつて standalone の /_next/image 400 対策として /uploads/** だけを列挙していたが、
        // アップロード画像は isUploadedImageUrl() による unoptimized で最適化を迂回するため
        // 現在 /_next/image を通らず、この列挙は機能していなかった。
        // 一方で列挙を残すと public/ の静的画像が全て弾かれ、ヒーロー画像未設定時に
        // フォールバックの /kaza-love_logo.png でトップページが 500 になる。
        remotePatterns: [
            {
                protocol: "https",
                hostname: "kaza-love.com",
            },
            {
                protocol: "https",
                hostname: "www.kaza-love.com",
            },
            {
                protocol: "https",
                hostname: "setaseisakusyo.com",
            },
            {
                protocol: "https",
                hostname: "www.setaseisakusyo.com",
            },
        ],
    },
    async headers() {
        return [
            {
                source: "/:path*",
                headers: securityHeaders,
            },
        ];
    },
    async redirects() {
        return [
            {
                source: "/discription",
                destination: "/company",
                permanent: true,
            },
            {
                source: "/works-manage",
                destination: "/gallery-manage",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
