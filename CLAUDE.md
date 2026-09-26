# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**飾Love(かざらぶ)** ブランドの EC兼ブランドサイト(`kaza-love.com`)。Next.js 15 (App Router) + MUI + Prisma + MySQL で構成されたフルスタックWebアプリケーション。
(旧ドメイン `setaseisakusyo.com` は Nginx で `kaza-love.com` へ 301 リダイレクト。サイトのドメイン参照・sitemap・canonical はすべて `kaza-love.com` に統一する。)

飾Love は、富山県高岡市の小さな工房から MLBカード・トレカコレクター向けのハンドメイドアクリルディスプレイをお届けする新ブランド。
運営事業者は個人事業所「**瀬田製作所**」(屋号)— 法的表記(特商法・プライバシーポリシー)では「販売業者: 瀬田製作所」と記載するが、サイト表示・SNS・OG情報・サブジェクト等のブランド面はすべて「飾Love」で統一する。
ブランド表記ルール・タグライン「飾る愛、というのもある。」・歴史は [`docs/file/branding_kaza-love.md`](docs/file/branding_kaza-love.md) を参照。

サイト内に決済・カート機能はない。商品ごとの外部購入URL（`purchaseUrl` = BASE、`amazonUrl` = Amazon）へ誘導し、どちらも未設定の商品はお問い合わせへ誘導する。購入先の一覧は `getPurchaseLinks()`（`src/lib/types/product.ts`）で組み立てる。

## Tech Stack

- **Frontend**: Next.js 15, React 19, MUI v6
- **Backend**: Next.js API Routes, NextAuth.js v5 (JWT + Credentials / Google OAuth)
- **Database**: MySQL 8.0, Prisma ORM
- **Deployment**: Docker, Nginx, GitHub Container Registry, GitHub Actions
- **Test**: Vitest
- **Other**: reCAPTCHA v3, Nodemailer, Zod, Google Analytics 4, X API v2

## Project Structure

```
seta-hp/
├── next/                    # Next.jsアプリケーション
│   ├── src/
│   │   ├── app/             # App Router pages & API routes
│   │   │   ├── _home/       # トップページのセクション
│   │   │   └── _legal/      # 法務ページ共通レイアウト
│   │   ├── components/      # 共有コンポーネント
│   │   │   ├── manage/      # 管理画面共通（一覧・フォーム・削除確認）
│   │   │   ├── review/      # 社内レビューコメントUI
│   │   │   ├── auth/        # ログイン・登録画面の部品
│   │   │   ├── product/     # 商品カード部品（枠・画像・タイトル・価格）
│   │   │   └── gallery/     # ギャラリー作品画像（WorkImage）
│   │   ├── lib/             # ユーティリティ
│   │   │   ├── constants/   # カテゴリ・在庫定義
│   │   │   ├── hooks/       # 管理画面CRUD用フック
│   │   │   ├── api-response.ts  # APIレスポンスヘルパー
│   │   │   ├── api-utils.ts     # API認可（requireEditor/requireAdmin）+ JSON検証
│   │   │   ├── managed-resource-route.ts # 管理リソースの一覧・削除共通処理
│   │   │   ├── admin-auth.ts    # 管理ページの認可
│   │   │   ├── rate-limit.ts    # レート制限（DB共有対応）
│   │   │   ├── reviewCommentsGuard.ts # レビューAPIガード
│   │   │   ├── upload-validation.ts # 画像アップロード検証
│   │   │   ├── validation.ts    # Zodバリデーション（統一済み）
│   │   │   ├── site-config.ts   # サイトURL・名称・連絡先の定数
│   │   │   ├── navigation.ts    # ヘッダー・スマホメニュー・フッター共通のリンク定義
│   │   │   ├── x-client.ts      # X API クライアント
│   │   │   ├── auth.ts          # NextAuth初期化
│   │   │   └── db.ts            # Prismaクライアント
│   │   ├── __tests__/       # Vitest
│   │   └── theme/           # MUIテーマ設定
│   ├── middleware.ts        # 管理ページの認証・権限チェック
│   ├── auth.config.ts       # NextAuth設定（providers, callbacks）
│   ├── prisma/              # Prismaスキーマ・migration・シード
│   ├── scripts/             # create-admin.sh（管理者ユーザー作成）
│   └── public/              # 静的ファイル
├── docker-compose.yml          # 本番環境（ベース）
├── docker-compose.override.yml # ローカル開発用（自動読込、port 3001）
├── docker-compose.local.yml    # ローカルビルド検証用
├── nginx/                      # Nginx設定（テンプレート + entrypoint）
├── scripts/                    # 運用スクリプト（DBバックアップ・SSL更新・監視・worktree初期化）
├── certbot/ fail2ban/ logwatch/ # 本番サーバーの証明書・防御・ログ監視設定
├── uploads/                    # アップロード画像（本番でコンテナにマウント）
└── docs/                       # ブランド資料・デザインモック
```

## Development Commands

```bash
# Docker開発環境の起動
docker compose up --build

# standaloneイメージのローカルビルド検証
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build

# 個別コマンド (nextディレクトリで実行)
cd next
yarn dev              # 開発サーバー（webpack。Turbopack は Google Fonts の新URL形式を処理できず無効化）
yarn build            # プロダクションビルド
yarn lint             # ESLint
yarn typecheck        # 型チェック (.next を再生成してから実行)
yarn test             # Vitest
yarn create:admin     # 管理者ユーザーを対話形式で作成

# Prisma
npx prisma generate   # Clientの生成
npx prisma migrate deploy # migrationを空DBから順番に適用
npx prisma studio     # DB GUIツール
ADMIN_EMAIL=... ADMIN_PASSWORD=... npx prisma db seed # 管理者ユーザーを作成
```

`prisma db push` は使わない（データを失う恐れがあるため。CIでも起動スクリプト等での使用を検出して失敗させる）。

## Key Pages

### 公開ページ

| Path | Description |
|------|-------------|
| `/` | トップページ (Hero, Catalogue, Features, CTA)。サイズ診断の告知（`QuizTeaserSection`）は #326 で非表示（部品は残してある） |
| `/products` | 商品一覧（`?category=` で絞り込み） |
| `/products/[id]` | 商品詳細（存在しない・非公開なら404）。紐づいた作品を「この商品を使った展示例」として表示 |
| `/gallery` | ギャラリー（Work を表示）。各作品に「この展示に使った商品」へのリンク。`?work={id}` でその作品の拡大表示を開く |
| `/company` | 会社情報(飾Love / 運営: 瀬田製作所) |
| `/contact` | お問い合わせフォーム（ADMIN は問い合わせ管理を表示） |
| `/shipping` | 配送について |
| `/legal` | 特定商取引法に基づく表記 |
| `/privacy-policy` | プライバシーポリシー |
| `/login` | ログイン |
| `/register` | ユーザー登録 |

### 非表示ページ

| Path | Description |
|------|-------------|
| `/about` | 飾Love について(工房紹介)。#312 で非表示化（ナビ・フッター・sitemap から除外、noindex）。ページ自体は残っておりURL直打ちで表示される |

### 管理ページ（認証必要: ADMIN/EDITOR）

| Path | Description |
|------|-------------|
| `/products-manage` | 商品管理 |
| `/gallery-manage` | ギャラリー管理 |
| `/works-manage` | 互換URL（`next.config.ts` の redirects で `/gallery-manage` へリダイレクト） |
| `/news` | お知らせ管理（公開ページでの表示はない） |
| `/x-post` | X（旧Twitter）への手動投稿（**ADMIN のみ**。外部発信で取り消せないため EDITOR 不可） |

## Database Models

- **User**: ユーザー (ADMIN/EDITOR/VIEWER roles, cuid ID)
- **Product**: 商品 (名前, 価格, カテゴリ, 複数画像 Json, 在庫状況, 公開フラグ, ヒーロー画像フラグ, 外部購入URL: BASE の `purchaseUrl` / Amazon の `amazonUrl`（VARCHAR(512)、amazon.co.jp 等のドメインのみ許可）)
  - `sleeve`（JSON）: 対応スリーブ（名前・メーカー・寸法・付属枚数・「スリーブなし」選択時の値引き額）。形は `productSleeveSchema`、読み取りは `parseProductSleeve()`。設計ツールからの商品登録で設計のスリーブが送られ（未送信なら変更しない）、HP 管理画面でも編集できる。商品詳細に「対応スリーブ」欄として表示
- **Work**: ギャラリー作品（`/gallery` に表示）
- **WorkProduct**: 作品とそれに使った商品の紐づけ（多対多）。管理画面の作品編集で設定し、商品詳細⇔ギャラリーの相互リンクに使う。公開側は双方とも公開中のものだけ表示
- **News**: お知らせ (日付, タイトル, JSON contents)
- **Inquiry**: お問い合わせ
- **Account**: Google OAuthアカウント連携（セッション自体はJWT Cookie）
- **ReviewComment** / **ReviewCommentReply**: 社内レビュー用のページ内コメントと返信（`NEXT_PUBLIC_ENABLE_COMMENTS=true` の時のみ使用）
- **ApiRateLimit**: レート制限のカウンタ（DB共有ストア）

## Environment Variables

アプリの変数は `next/.env`、Docker Compose・Nginx の変数はリポジトリ直下の `.env` に設定する（それぞれ `.env.example` あり）。

### `next/.env`（アプリ）
- `DATABASE_URL`: MySQL接続文字列
- `AUTH_SECRET`: NextAuth暗号化キー
- `NEXTAUTH_URL`: 認証コールバックURL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`: Google OAuth（任意。3つ揃った時のみ有効）
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY`: reCAPTCHA v3（両方揃った時のみ有効）
- `ALLOWED_RECAPTCHA_HOSTNAMES`: reCAPTCHA で許可するホスト名（カンマ区切り、任意）
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`: メール送信
- `CONTACT_TO_EMAIL`: 問い合わせ通知の宛先（未設定なら `SMTP_USER`）
- `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`: X 投稿用（任意）
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: GA4 測定ID。静的生成ページにも埋め込むためビルド時に必要（CIではリポジトリ変数から渡す）
- `NEXT_PUBLIC_ENABLE_COMMENTS`: `true` で社内レビューコメントを有効化（本番では設定しない）
- `RATE_LIMIT_STORE`: `memory` / `database`（未設定なら `DATABASE_URL` があれば DB）
- `SSO_VERIFY_ENABLED`: `1` で `/api/auth/verify-admin` を有効化（Designer SSO）
- `SSO_COOKIE_DOMAIN` / `SSO_COOKIE_SECURE`: Designer とセッションCookieを共有するための設定。`docker-compose.yml` で本番値を固定し、ローカル用の compose で空・`0` に上書きしている
- `NEXT_PUBLIC_DESIGNER_URL`: Designer へのリンク先（既定 `https://designer.kaza-love.com`）
- `DESIGNER_API_SECRET`: 設計ツール（Designer）から商品を登録する連携APIの共有秘密。Designer 側の `HP_API_SECRET` と同じ値にする。未設定なら連携APIは 503

### リポジトリ直下 `.env`（Docker Compose / Nginx）
- `MYSQL_ROOT_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD`: MySQL コンテナ
- `IMAGE_TAG`: 本番で使うイメージのタグ
- `SERVER_NAME` / `OLD_SERVER_NAME`: Nginx のドメイン（旧ドメインは 301 リダイレクト）
- `PROXY_SSO_SECRET`: Nginx が Designer へ `X-SSO-Auth` ヘッダーで渡す共有秘密
- `DEV_BIND_ADDRESS` / `DEV_PORT` / `DEV_NEXTAUTH_URL`: ローカル開発用
- `ADMIN_ALLOWED_IPS`: 管理エリア（管理ページ・管理API書込・ログイン/登録・認証API）を許可するIP/CIDR（スペース区切り、Nginx層で制限）。未設定なら制限なし。`/api/auth/session` のみ常時公開

## Critical Patterns

### API Routes
- `/api/auth/[...nextauth]`: NextAuth認証エンドポイント
- `/api/products` / `/api/works` / `/api/news`: 商品・ギャラリー・お知らせのCRUD
  - `/api/works` の POST/PUT は `productIds`（使用商品）を受け付ける。PUT は指定時のみ紐づけを入れ替え、未指定なら変更しない。管理用 GET（`includeUnpublished=true`）は `productIds` を返す
  - GET: 公開（非公開データの取得は ADMIN/EDITOR）
  - POST / PUT: ADMIN/EDITOR
  - DELETE: **ADMIN のみ**
- `/api/email`: お問い合わせ（POST 送信は公開・レート制限あり / GET 一覧・DELETE は ADMIN のみ）
- `/api/recaptcha`: reCAPTCHA検証（レート制限あり）
- `/api/register`: ユーザー登録（レート制限あり）
- `/api/upload`: 画像アップロード（POST, ADMIN/EDITOR）
- `/api/x/post`: X への投稿（POST, ADMIN のみ, レート制限あり）。`X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` 未設定時は 503
- `/api/review-comments`（`[id]`, `[id]/replies` を含む）: 社内レビューコメントCRUD（レート制限あり）。`NEXT_PUBLIC_ENABLE_COMMENTS=true` 以外では 404
- `/api/auth/verify-admin`: nginx `auth_request` 用の管理者検証（Designer SSO）。ADMIN なら 200＋身元ヘッダー。`SSO_VERIFY_ENABLED=1` の時のみ有効で、未設定なら常に 403
- `/api/health`: ヘルスチェック（GET, 常に `{ status: "ok" }`）
- `/api/integrations/designer/products`: 設計ツールからの商品登録（#322）。`Authorization: Bearer <DESIGNER_API_SECRET>` で認証するサーバー間通信専用で、nginx は外部から通さない（designer-backend が Docker ネットワーク内の `next_app:3000` を直接呼ぶ）
  - POST（multipart: `payload` JSON ＋ `images` ファイル）: `designerDesignId` で照合して作成または更新。新規は必ず非公開、更新では公開状態を変えない。画像を送った時だけ差し替える
  - GET `?designerDesignId=`: 紐づく商品の ID と公開状態

API の認可とJSON検証は `src/lib/api-utils.ts` の `parseEditorJson` / `parseAdminJson` を使う。

### 管理エリアの防御（多層）
1. Nginx: `ADMIN_ALLOWED_IPS` による IP 制限
2. `next/middleware.ts`: `/products-manage` `/gallery-manage` `/news` で未認証はログインへ、権限不足はトップへ
3. ページ・API 側の `requireAdmin` / `requireEditor` 等による認可

### Validation
- Zodスキーマに統一 (`src/lib/validation.ts`、レビューコメントは `src/lib/review-validation.ts`)
- InquirySchema, RegistrationSchema, RecaptchaRequestSchema, XPostSchema, Product/Work/NewsのCreate・Updateスキーマ
- XSSサニタイズ対応（xssパッケージ）。サニタイズ後の値でDBの長さ上限を検証する

### Rate Limiting
- 統一されたレート制限 (`src/lib/rate-limit.ts`, 既定はDB共有ストア)
- プリセット: register, login, loginIp, contact, recaptcha, review, reviewUpdate, xPost

### Session Types
- `src/app/types/next-auth.d.ts` でSession/User/JWT型を拡張
- UserRole型: "ADMIN" | "EDITOR" | "VIEWER"

### Security Headers
- `next.config.ts` でセキュリティヘッダーを設定（HSTS, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy 等）

### SEO Routes
- `src/app/robots.ts` と `src/app/sitemap.ts` が正本（App Router Metadata Route）
- `public/robots.txt` / `public/sitemap*.xml` の静的生成物は使用しない
- sitemapはリクエスト時に公開商品をDBから取得し、静的ページと合わせて返す
- 構造化データ（JSON-LD）は `src/lib/structured-data.ts` で組み立て、`src/lib/json-ld.ts` でエスケープして埋め込む

### Styling
- MUIコンポーネント + カスタムテーマ (`src/theme/`)
- `sx` と法務ページ共通レイアウト（`src/app/_legal/`）で表示規則を管理
- スクロールバーは全要素で非表示、ページの横スクロールは `overflow-x: clip` で抑止（`globals.css`）
- 日本語見出しは単語途中で改行しない（h1〜h4 は `globals.css`、それ以外のタイトルは `PHRASE_WRAP_SX`）
- スマホ対応の方針: タップ領域は高さ 40〜48px、入力欄は 16px（iOS の自動ズーム防止）、商品カードは sm 未満で横並び（`COMPACT_CARD_LAYOUT_SX`）、商品詳細はスマホで購入バーを下部に固定

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
- 画像アップロードは `public/uploads` に保存する。本番ではリポジトリ直下の `uploads/` をコンテナの `/app/public/uploads` にマウントし、`/uploads/` は Nginx が直接配信する
- ブランチ: `main`(本番) → `develop`(開発) → 作業ブランチ `{type}/{issue番号}`（例: `fix/101`, `feature/132`）
- CI/CD（`.github/workflows/deploy_production.yml`）
  - `develop` 宛の PR: migration の空DB適用・lint・typecheck・test・build・Nginx設定検証
  - `main` への push: 上記に加え、GHCR へイメージを push して本番サーバーへデプロイ
