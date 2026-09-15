# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**飾Love(かざらぶ)** ブランドの EC兼ブランドサイト(`kaza-love.com`)。Next.js 15 (App Router) + MUI + Prisma + MySQL で構成されたフルスタックWebアプリケーション。
(旧ドメイン `setaseisakusyo.com` は Nginx で `kaza-love.com` へ 301 リダイレクト。サイトのドメイン参照・sitemap・canonical はすべて `kaza-love.com` に統一する。)

飾Love は、富山県高岡市の小さな工房から MLBカード・トレカコレクター向けのハンドメイドアクリルディスプレイをお届けする新ブランド。
運営事業者は個人事業所「**瀬田製作所**」(屋号)— 法的表記(特商法・プライバシーポリシー)では「販売業者: 瀬田製作所」と記載するが、サイト表示・SNS・OG情報・サブジェクト等のブランド面はすべて「飾Love」で統一する。
ブランド表記ルール・タグライン「飾る愛、というのもある。」・歴史は [`docs/file/branding_kaza-love.md`](docs/file/branding_kaza-love.md) を参照。

## Tech Stack

- **Frontend**: Next.js 15, React 19, MUI v6
- **Backend**: Next.js API Routes, NextAuth.js v5 (JWT + Credentials / Google OAuth)
- **Database**: MySQL 8.0, Prisma ORM
- **Deployment**: Docker, Nginx, GitHub Container Registry, GitHub Actions
- **Other**: reCAPTCHA v3, Nodemailer, Zod

## Project Structure

```
seta-hp/
├── next/                    # Next.jsアプリケーション
│   ├── src/
│   │   ├── app/             # App Router pages & API routes
│   │   ├── components/      # 共有コンポーネント
│   │   ├── lib/             # ユーティリティ
│   │   │   ├── constants/   # カテゴリ・在庫定義
│   │   │   ├── api-response.ts  # APIレスポンスヘルパー
│   │   │   ├── rate-limit.ts    # レート制限（DB共有対応）
│   │   │   ├── reviewCommentsGuard.ts # レビューAPIガード
│   │   │   ├── upload-validation.ts # 画像アップロード検証
│   │   │   ├── validation.ts    # Zodバリデーション（統一済み）
│   │   │   ├── auth.ts          # NextAuth初期化
│   │   │   └── db.ts            # Prismaクライアント
│   │   ├── __tests__/       # Vitest
│   │   └── theme/           # MUIテーマ設定
│   ├── auth.config.ts       # NextAuth設定（providers, callbacks）
│   ├── prisma/              # Prismaスキーマ & シード
│   └── public/              # 静的ファイル
├── docker-compose.yml          # 本番環境（ベース）
├── docker-compose.override.yml # ローカル開発用（自動読込、port 3001）
├── docker-compose.local.yml    # ローカルビルド検証用
└── nginx/                      # Nginx設定
```

## Development Commands

```bash
# Docker開発環境の起動
docker compose up --build

# standaloneイメージのローカルビルド検証
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build

# 個別コマンド (nextディレクトリで実行)
cd next
yarn dev              # 開発サーバー (Turbopack)
yarn build            # プロダクションビルド
yarn lint             # ESLint
yarn typecheck        # 型チェック (.next を再生成してから実行)

# Prisma
npx prisma generate   # Clientの生成
npx prisma migrate deploy # migrationを空DBから順番に適用
npx prisma studio     # DB GUIツール
npx prisma db seed    # シードデータ投入
```

## Key Pages

### 公開ページ

| Path | Description |
|------|-------------|
| `/` | トップページ (Hero, カテゴリ, 特集商品, 工房紹介, CTA) |
| `/products` | 商品一覧 |
| `/products/[id]` | 商品詳細 |
| `/gallery` | ギャラリー |
| `/about` | 飾Love について(工房紹介) |
| `/company` | 会社情報(飾Love / 運営: 瀬田製作所) |
| `/contact` | お問い合わせフォーム（ADMIN は問い合わせ管理を表示） |
| `/shipping` | 配送について |
| `/legal` | 特定商取引法に基づく表記 |
| `/privacy-policy` | プライバシーポリシー |
| `/login` | ログイン |
| `/register` | ユーザー登録 |

### 管理ページ（認証必要: ADMIN/EDITOR）

| Path | Description |
|------|-------------|
| `/products-manage` | 商品管理 |
| `/gallery-manage` | ギャラリー管理 |
| `/works-manage` | 互換URL（`/gallery-manage` へリダイレクト） |
| `/news` | ニュース管理 |

## Database Models

- **User**: ユーザー (ADMIN/EDITOR/VIEWER roles, cuid ID)
- **Product**: 商品 (名前, 価格, カテゴリ, 複数画像 Json, 在庫状況, 公開フラグ)
- **Work**: 実績・ポートフォリオ
- **News**: ニュース記事 (日付, タイトル, JSON contents)
- **Inquiry**: お問い合わせ
- **Account**: Google OAuthアカウント連携（セッション自体はJWT Cookie）

## Environment Variables

開発環境は `next/.env` に設定。主要な変数:
- `DATABASE_URL`: MySQL接続文字列
- `AUTH_SECRET`: NextAuth暗号化キー
- `NEXTAUTH_URL`: 認証コールバックURL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth（任意）
- `RECAPTCHA_SECRET_KEY`: reCAPTCHA検証用
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`: メール送信
- `ADMIN_ALLOWED_IPS`: 管理エリア（管理ページ・管理API書込・ログイン/登録・認証API）を許可するIP/CIDR（スペース区切り、Nginx層で制限）。未設定なら制限なし。`/api/auth/session` のみ常時公開

## Critical Patterns

### API Routes
- `/api/auth/[...nextauth]`: NextAuth認証エンドポイント
- `/api/products`: 商品CRUD（GET公開, 書込ADMIN/EDITOR, 非公開取得ADMIN/EDITOR）
- `/api/email`: お問い合わせメール送信（レート制限あり）
- `/api/recaptcha`: reCAPTCHA検証（レート制限あり）
- `/api/register`: ユーザー登録（レート制限あり）
- `/api/news`: ニュースCRUD
- `/api/works`: 実績CRUD

### Validation
- Zodスキーマに統一 (`src/lib/validation.ts`)
- InquirySchema, RegistrationSchema, Product/Work/NewsのCreate・Updateスキーマ
- XSSサニタイズ対応（xssパッケージ）

### Rate Limiting
- 統一されたレート制限 (`src/lib/rate-limit.ts`, 既定はDB共有ストア)
- プリセット: register, login, loginIp, contact, recaptcha, review, reviewUpdate

### Session Types
- `src/app/types/next-auth.d.ts` でSession/User/JWT型を拡張
- UserRole型: "ADMIN" | "EDITOR" | "VIEWER"

### Security Headers
- `next.config.ts` でセキュリティヘッダーを設定（HSTS, X-Frame-Options等）

### SEO Routes
- `src/app/robots.ts` と `src/app/sitemap.ts` が正本（App Router Metadata Route）
- `public/robots.txt` / `public/sitemap*.xml` の静的生成物は使用しない
- sitemapはリクエスト時に公開商品をDBから取得し、静的ページと合わせて返す

### Styling
- MUIコンポーネント + カスタムテーマ (`src/theme/`)
- `sx` と法務ページ共通レイアウトで表示規則を管理

## 並行作業（git worktree）

複数の作業を同時に進めるときは worktree で作業ツリーを分ける。同じディレクトリを
複数のセッションで編集すると、互いの未コミット変更を取り込んでしまう事故が起きる。

```bash
# 作成 → 初期化
git worktree add ../seta-hp-<name> -b <branch>
cd ../seta-hp-<name>
bash scripts/setup-worktree.sh          # .env 等のローカル資産をメインからコピー
bash scripts/setup-worktree.sh --install # yarn install もまとめて実行する場合

# 片付け
git worktree remove ../seta-hp-<name>
```

worktree には gitignore 対象のファイル（`.env` / `next/.env` / `node_modules` /
`uploads/` / `mysql/data/`）が引き継がれない。`setup-worktree.sh` が `.env` 系を
メイン作業ツリーからコピーし、依存関係の導入手順を案内する。

**Docker スタックは必ずメイン作業ツリーでのみ起動する。**
`docker-compose.yml` は `container_name`（`next_app` / `mysql_db` / `nginx_proxy`）と
公開ポート（3001 / 2999 / 80 / 443）を固定しているため、worktree から
`docker compose up` するとメイン側のコンテナと衝突する。
worktree はコード編集・レビュー・`yarn lint` / `yarn test` / `yarn build` に使う。

## Workflow Best Practices

- `next/` ディレクトリがアプリケーション本体
- Docker環境推奨（MySQL依存のため）
- 認証が必要なページは `/login` 経由でアクセス
- 画像アップロードは `/public/uploads` に保存
- ブランチ: `main`(本番) → `develop`(開発) → `feature/*` or `fix/*`
