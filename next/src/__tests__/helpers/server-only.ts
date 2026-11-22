// Vitest 用の空モジュール。Next.js は "server-only" をバンドラー側で解決するが、
// テスト環境（node_modules に実体がない）では解決できないため vitest.config.ts で別名を張る。
export {};
