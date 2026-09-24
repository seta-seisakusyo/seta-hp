# 飾Love (かざらぶ) サイト

**飾Love(かざらぶ)** は、富山県高岡市の小さな工房から MLBカード・トレカコレクター向けのハンドメイドアクリルディスプレイをお届けする新ブランドです。
本リポジトリ(`kaza-love.com`)はそのEC兼ブランドサイトのソースコード(旧ドメイン `setaseisakusyo.com` は 301 リダイレクトで継続運用)。
Next.js 15 (App Router) + MUI + Prisma + MySQL で構成されたフルスタック Web アプリケーション。

> 運営事業者は富山県高岡市の個人事業所「**瀬田製作所**」(屋号)。
> 飾Love のブランド表記ルール・タグライン・歴史は [`docs/file/branding_kaza-love.md`](docs/file/branding_kaza-love.md) を参照。

## 目次

- [クイックスタート](#クイックスタート)
- [Docker環境の構成](#docker環境の構成)
- [環境変数の設定](#環境変数の設定)
- [開発コマンド](#開発コマンド)
- [主要技術スタック](#主要技術スタック)
- [ページ一覧](#ページ一覧)
- [API エンドポイント](#api-エンドポイント)
- [データベースモデル](#データベースモデル)
- [ディレクトリ構成](#ディレクトリ構成)
- [開発ルール](#開発ルール)
- [DB運用](#db運用)
- [SEO設定](#seo設定)
- [セキュリティ](#セキュリティ)
- [本番デプロイ](#本番デプロイ)
- [運用スクリプト](#運用スクリプト)

## クイックスタート

### 必要条件

- Docker & Docker Compose
- Node.js 20+（ローカル開発時）
- Yarn

### セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/Ryuji0128/seta-hp.git
cd seta-hp

# 2. Docker Compose用とアプリ用の環境変数ファイルを配置
cp .env.example .env
cp next/.env.example next/.env
# 各.envファイルを編集して必要な値を設定

# 3. Docker開発環境を起動
docker compose up --build

# 4. ブラウザでアクセス
# http://127.0.0.1:3001
```

### ローカル開発（Docker なし）

```bash
cd next
yarn install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed    # シードデータ投入（任意）
yarn dev              # http://localhost:3000
```

### 停止

```bash
docker compose down
```

## Docker環境の構成

### ローカル開発環境（docker-compose.yml + docker-compose.override.yml）

| サービス | コンテナ名 | ポート | 説明 |
|---------|-----------|--------|------|
| next | next_app | 3001:3000 | Next.js開発サーバー（ホットリロード） |
| mysql | mysql_db | 3306 | MySQL 8.0 データベース |
| nginx | nginx_proxy | 80, 443 | リバースプロキシ |

`docker compose up` は起動時に `prisma migrate deploy` を実行します。
データ損失を強制し得る `prisma db push` はコンテナ起動処理に使用しません。
ポートや公開URLはルート `.env` の `DEV_PORT` / `DEV_NEXTAUTH_URL` で変更できます。

### ローカルビルド環境（docker-compose.yml + docker-compose.local.yml）

| サービス | コンテナ名 | ポート | 説明 |
|---------|-----------|--------|------|
| next | next_app | 2999:3000 | Next.js（standalone / ローカルビルド） |
| mysql | mysql_db | 3306 | MySQL 8.0 データベース |
| nginx | nginx_proxy | 80, 443 | リバースプロキシ（SSL 対応） |
| certbot | certbot | - | SSL 証明書管理 |

### アーキテクチャ（本番）

```
[ブラウザ] → [nginx:443] → [next:3000] → [mysql:3306]
              ↑ SSL/TLS
         [certbot] (証明書更新)
```

## 環境変数の設定

Docker Composeが展開する値はルートの `.env.example` を `.env` に、Next.jsが読む値は
`next/.env.example` を `next/.env` にコピーして設定します。Composeの `environment` は
`next/.env` より優先されます。

ルート `.env` の主な変数：

| 変数名 | 説明 |
|--------|------|
| `IMAGE_TAG` | デプロイするコンテナイメージのタグ |
| `MYSQL_ROOT_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | MySQL設定 |
| `DEV_BIND_ADDRESS` / `DEV_PORT` / `DEV_NEXTAUTH_URL` | ローカルDocker開発環境の待受アドレス・ポート・認証URL |
| `NEXTAUTH_URL` | ComposeからNext.jsへ渡す公開URL |
| `SERVER_NAME` / `OLD_SERVER_NAME` | 現行・旧ドメイン |
| `PROXY_SSO_SECRET` | Designer SSOの共有秘密 |
| `ADMIN_ALLOWED_IPS` | 管理領域を許可するIP/CIDR（スペース区切り） |

`next/.env` の主な変数：

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | MySQL 接続文字列 |
| `RATE_LIMIT_STORE` | `database` / `memory`。省略時は環境に応じて自動選択 |
| `AUTH_SECRET` | NextAuth 暗号化キー |
| `NEXTAUTH_URL` | 認証コールバック URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth（任意） |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Google 認証の有効化フラグ（任意） |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 サイトキー（フロントエンド用） |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 検証用（サーバー用） |
| `ALLOWED_RECAPTCHA_HOSTNAMES` | reCAPTCHA 許可ホスト名（カンマ区切り） |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | メール送信設定 |
| `CONTACT_TO_EMAIL` | お問い合わせ受信メールアドレス |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | 管理者シードデータ（`prisma db seed` 用） |
| `SSO_COOKIE_DOMAIN` / `SSO_COOKIE_SECURE` / `SSO_VERIFY_ENABLED` | Designer SSO設定（任意） |
| `NEXT_PUBLIC_DESIGNER_URL` | Designerの公開URL（任意） |
| `NEXT_PUBLIC_ENABLE_COMMENTS` | 社内レビューコメントの有効化フラグ（任意） |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Googleアナリティクス4 の測定ID `G-XXXXXXXXXX`（任意）。未設定なら計測タグを描画しない |

> **本番の測定IDは GitHub のリポジトリ変数 `NEXT_PUBLIC_GA_MEASUREMENT_ID` が唯一の設定箇所です。**
>
> `NEXT_PUBLIC_*` は `yarn build` の時点で存在すればHTML・JSへインライン展開され、実行時の環境変数より優先されます。
> CI がリポジトリ変数を Docker のビルド引数として渡すため、静的生成ページ（`/about` `/company` `/legal`
> `/privacy-policy` `/shipping`）も含めた全ページに反映されます。
>
> 逆にビルド時に未設定だと、インライン展開されず実行時参照のまま残ります。この場合
> **動的レンダリングのページでしか計測されず、静的生成ページが丸ごと欠落します**（#128 で実際に発生）。
> 本番サーバの `next/.env` に置く運用はこの落とし穴を踏むため採用していません。
>
> 測定IDを変更したときは、**再ビルドを伴うデプロイが必要**です。`.env` の書き換えと再起動では反映されません。


## 開発コマンド

```bash
# Docker開発環境（ホットリロード、http://127.0.0.1:3001）
docker compose up --build  # 起動
docker compose down        # 停止
docker compose logs -f next
docker compose exec next sh

# standaloneイメージのローカルビルド検証（http://127.0.0.1:2999）
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build

# ローカル（next/ ディレクトリで実行）
cd next
yarn dev              # 開発サーバー (Turbopack)
yarn build            # プロダクションビルド
yarn lint             # ESLint
yarn typecheck        # 型チェック (.next を再生成してから実行)

# Prisma
npx prisma generate   # Client 再生成
npx prisma migrate deploy # migrationを空DBから順番に適用
npx prisma studio     # DB GUI ツール
npx prisma db seed    # シードデータ投入
```

## 主要技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 15, React 19, MUI v6 |
| Backend | Next.js API Routes, NextAuth.js v5 (JWT + Credentials / Google OAuth) |
| Database | MySQL 8.0, Prisma ORM |
| セキュリティ | reCAPTCHA v3, Zod バリデーション, XSS サニタイズ, レート制限 |
| インフラ | Docker, Nginx, GitHub Container Registry, GitHub Actions (CI/CD) |
| メール | Nodemailer (SMTP) |

## ページ一覧

### 公開ページ

| パス | 説明 |
|------|------|
| `/` | トップページ (Hero, カテゴリ, 特集商品, 工房紹介, CTA) |
| `/products` | 商品一覧 |
| `/products/[id]` | 商品詳細 |
| `/gallery` | ギャラリー |
| `/about` | 飾Love について(工房紹介) |
| `/company` | 会社情報(飾Love / 運営: 瀬田製作所) |
| `/contact` | お問い合わせフォーム（ADMIN は問い合わせ管理画面を表示） |
| `/shipping` | 配送について |
| `/legal` | 特定商取引法に基づく表記 |
| `/privacy-policy` | プライバシーポリシー |

### 認証ページ

| パス | 説明 |
|------|------|
| `/login` | ログイン（Credentials / Google OAuth） |
| `/register` | ユーザー登録 |

### 管理ページ（要ログイン）

| パス | 説明 |
|------|------|
| `/products-manage` | 商品管理 |
| `/gallery-manage` | ギャラリー管理 |
| `/news` | ニュース管理 |

> **Note**: 管理ページは基本的に `ADMIN` / `EDITOR` が利用対象です。削除操作など一部 API は `ADMIN` 専用です。
> 旧 `/works-manage` は互換性のため `/gallery-manage` へ恒久リダイレクトします。

## API エンドポイント

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth 認証 | - |
| GET/POST/PUT/DELETE | `/api/products` | 商品 CRUD | GET公開（非公開取得はADMIN/EDITOR）/ POST・PUT: ADMIN/EDITOR / DELETE: ADMIN |
| GET/POST/PUT/DELETE | `/api/works` | 実績 CRUD | GET公開 / POST・PUT: ADMIN/EDITOR / DELETE: ADMIN |
| GET/POST/PUT/DELETE | `/api/news` | ニュース CRUD | GET公開 / POST・PUT: ADMIN/EDITOR / DELETE: ADMIN |
| GET/POST/DELETE | `/api/email` | お問い合わせ（送信・一覧・削除） | POST: レート制限 / GET・DELETE: ADMIN |
| POST | `/api/recaptcha` | reCAPTCHA 検証 | - (レート制限あり) |
| POST | `/api/register` | ユーザー登録 | - (レート制限あり) |
| POST | `/api/upload` | 画像アップロード | ADMIN/EDITOR |
| GET/POST | `/api/review-comments` | 社内レビューコメント一覧・作成 | 開発環境のみ有効 / レート制限あり |
| PATCH/DELETE | `/api/review-comments/[id]` | 社内レビューコメントの状態変更・削除 | 開発環境のみ有効 / レート制限あり |
| POST/DELETE | `/api/review-comments/[id]/replies` | 社内レビュー返信の作成・削除 | 開発環境のみ有効 / レート制限あり |
| GET | `/api/health` | ヘルスチェック | - |

## データベースモデル

| モデル | 説明 |
|--------|------|
| **User** | ユーザー (ADMIN / EDITOR / VIEWER ロール, Credentials / Google OAuth) |
| **Product** | 商品（名前, 価格, カテゴリ, 複数画像, 在庫状況, 公開/非公開） |
| **Work** | 実績・ポートフォリオ |
| **News** | ニュース記事（JSON コンテンツ） |
| **Inquiry** | お問い合わせ |
| **Account** | Google OAuthアカウント連携（セッション自体はJWT Cookie） |
| **ReviewComment / ReviewCommentReply** | 社内レビュー用ページコメントと返信 |

### 商品カテゴリ

- カードディスプレイ (`card-display`)
- アクリル製品 (`acrylic`)
- 3Dプリント製品 (`3d-print`)

### 在庫状況

- 在庫あり / 残りわずか / 受注生産 / 売り切れ

## ディレクトリ構成

```
seta-hp/
├── docker-compose.yml          # 本番用 Docker Compose
├── docker-compose.local.yml    # ローカルビルド用 Docker Compose override
├── nginx/                      # Nginx 設定
│   ├── default.conf.template
│   └── docker-entrypoint.sh
├── scripts/                    # 運用スクリプト
│   ├── renew-ssl.sh
│   ├── backup-db.sh
│   ├── monitor.sh
│   └── setup-monitoring.sh
├── fail2ban/                   # fail2ban 設定
├── logwatch/                   # logwatch 設定
├── certbot/                    # SSL 証明書（gitignore）
├── CLAUDE.md                   # Claude Code 設定
└── next/                       # Next.js アプリケーション
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    ├── auth.config.ts           # NextAuth 設定
    ├── prisma/
    │   ├── schema.prisma        # DB スキーマ定義
    │   ├── migrations/          # Prismaマイグレーション
    │   └── seed.js              # シードデータ
    ├── public/                  # 静的ファイル & アップロード画像
    └── src/
        ├── app/                 # App Router (ページ & API)
        │   ├── _home/           # トップページセクション
        │   ├── about/           # 飾Love について
        │   ├── api/             # API Routes
        │   │   ├── auth/        # NextAuth
        │   │   ├── email/       # お問い合わせ (送信・一覧・削除)
        │   │   ├── health/      # ヘルスチェック
        │   │   ├── news/        # ニュース CRUD
        │   │   ├── products/    # 商品 CRUD
        │   │   ├── recaptcha/   # reCAPTCHA 検証
        │   │   ├── register/    # ユーザー登録
        │   │   ├── review-comments/ # 社内レビューコメント
        │   │   ├── upload/      # 画像アップロード
        │   │   └── works/       # 実績 CRUD
        │   ├── company/         # 会社情報
        │   ├── contact/         # お問い合わせ
        │   ├── gallery/         # ギャラリー
        │   ├── gallery-manage/  # ギャラリー管理
        │   ├── legal/           # 特定商取引法
        │   ├── login/           # ログイン
        │   ├── news/            # ニュース管理
        │   ├── privacy-policy/  # プライバシーポリシー
        │   ├── products/        # 商品一覧 & 詳細
        │   ├── products-manage/ # 商品管理
        │   ├── register/        # ユーザー登録
        │   └── shipping/        # 配送について
        ├── __tests__/           # Vitest
        ├── components/          # 共有コンポーネント
        ├── lib/                 # ユーティリティ
        │   ├── constants/       # カテゴリ・在庫定義
        │   ├── api-response.ts  # API レスポンスヘルパー
        │   ├── auth.ts          # NextAuth 初期化
        │   ├── db.ts            # Prisma クライアント
        │   ├── pagination.ts    # ページネーション共通処理
        │   ├── rate-limit.ts    # DB共有対応のレート制限
        │   ├── reviewCommentsGuard.ts # レビューAPI有効化ガード
        │   ├── upload-validation.ts # 画像アップロード検証
        │   └── validation.ts    # Zod バリデーションスキーマ
        └── theme/               # MUI テーマ設定
```

## 開発ルール

### ブランチ運用

- `main` - 本番環境
- `develop` - 開発統合ブランチ
- `feature/*` - 新機能開発
- `fix/*` - バグ修正

### プルリクエスト

1. `develop` から作業ブランチを作成
2. 実装・コミット
3. `develop` へ PR 作成
4. レビュー後マージ
5. `develop` → `main` へ PR でリリース

## DB運用

### スキーマ変更時

```bash
# 1. schema.prisma を編集

# 2. マイグレーション作成
docker compose exec next npx prisma migrate dev --name your_migration_name

# 3. クライアント再生成（自動で実行されるが念のため）
docker compose exec next npx prisma generate
```

### トラブルシューティング

```bash
# Prisma キャッシュクリア
docker compose exec next sh -c "rm -rf node_modules/.prisma && npx prisma generate"

# DB 接続確認
docker compose exec mysql mysql -u app_user -papp_pass app_db
```

## SEO設定

### メタデータ

`next/src/app/layout.tsx` でサイト全体の SEO 設定を管理。

| 項目 | 説明 |
|-----|------|
| OGP | Open Graph Protocol（SNS 共有用） |
| Twitter Card | Twitter 向けカード表示 |
| robots | 検索エンジンクローラー設定 |
| canonical | 正規 URL 指定 |
| JSON-LD | 構造化データ（Organization） |

### Sitemap

App RouterのMetadata Routeでリクエスト時に生成する。

- `next/src/app/robots.ts`: `/robots.txt` を生成し、APIをクロール対象外にする
- `next/src/app/sitemap.ts`: `/sitemap.xml` を生成し、静的ページと公開商品を列挙する
- 公開商品の `lastModified` にはDBの実更新日時を使用する
- 管理画面・API・noindexページはサイトマップから除外する

## セキュリティ

### アプリケーション層

| 機能 | 説明 |
|-----|------|
| NextAuth 認証 | bcrypt によるパスワードハッシュ, JWT セッション |
| ロールベース認可 | ADMIN / EDITOR / VIEWER の 3 段階 |
| レート制限 | IP 単位のリクエスト制限（既定はDB共有ストア、必要に応じて memory に切替可） |
| バリデーション | Zod スキーマによるサーバーサイド検証 |
| reCAPTCHA v3 | フォームスパム対策 |
| XSS サニタイズ | `xss` パッケージによる入力サニタイズ |

### セキュリティヘッダー（Next.js + Nginx）

| ヘッダー | 効果 |
|---------|------|
| `Strict-Transport-Security` | HTTPS 強制（HSTS） |
| `Content-Security-Policy` | スクリプト/スタイル等の読み込み元制限 |
| `X-DNS-Prefetch-Control` | DNS プリフェッチ制御 |
| `X-Frame-Options` | クリックジャッキング防止 |
| `X-Content-Type-Options` | MIME スニッフィング防止 |
| `Referrer-Policy` | リファラー情報制限 |
| `Permissions-Policy` | ブラウザ機能制限（カメラ, マイク, 位置情報） |

### サーバーセキュリティ

- **fail2ban**: SSH / Nginx への不正アクセス対策
- **logwatch**: 日次ログレポート

## 本番デプロイ

GitHub Actions による自動デプロイ：

1. `develop` 宛のPR（`feature/*` / `fix/*` → `develop`）で migration再現、Lint、型検査、テスト、production build、Nginx HTTPS設定検証を実行
2. main push（またはworkflow_dispatch）で上記の検証を最終ゲートとして再実行し、Dockerイメージをビルドして ghcr.io へpush
3. 本番で同期済みNginx設定を事前検証
4. 旧アプリを停止して対象イメージからDB migrationを実行（短いメンテナンス時間）
5. 新アプリの直接healthを確認
6. SSL証明書を準備し、Nginxを強制再作成して外部経路のhealthを確認

migration失敗時は、新schemaと旧Prisma Clientの非互換を避けるため旧アプリを自動復帰せず停止状態を維持します。ログと直前の`IMAGE_TAG`を確認して手動復旧してください。

### 手動デプロイ

GitHub Actions の `Deploy_Production` を `workflow_dispatch` で実行してください。`docker compose pull && docker compose up -d` の直接実行は、migration・Nginx設定検証・設定再生成を迂回するため運用手順として使用しません。

### 期限のある資格情報

`GH_PAT`（本番サーバーが ghcr.io から pull するためのトークン）には**有効期限があります**。
切れるとデプロイの `docker login` が次のように失敗します。

```
Error response from daemon: Get "https://ghcr.io/v2/": denied: denied
```

サイトは稼働し続けるため運用中は気づけず、**次にデプロイしようとした時に初めて発覚します**。
更新は `gh secret set GH_PAT -R seta-seisakusyo/seta-hp`（必要スコープは `read:packages`）。
再発行の手間を避けたい場合は、有効期限を長め（または無期限）に設定してください。

なおビルドとpushは `GITHUB_TOKEN`（自動発行）を使うため、`GH_PAT` が切れても
`ci` と `build-and-push` は成功します。失敗するのは `deploy` だけです。

## 運用スクリプト

| スクリプト | 説明 |
|-----------|------|
| `scripts/renew-ssl.sh` | SSL 証明書の更新（1日2回のcronで実行） |
| `scripts/backup-db.sh` | EC / Designer DB バックアップ（14日間保持、DBごとに最低3件） |
| `scripts/monitor.sh` | EC / Designer のComposeサービス・外部経路・TLS証明書の残日数を監視 |
| `scripts/setup-monitoring.sh` | 監視環境セットアップ |
| `scripts/setup-worktree.sh` | git worktree の初期化（開発用。`.env` 等をメイン作業ツリーからコピー） |

```bash
# scripts/setup-monitoring.sh が作成する主要cron
*/5 * * * * root bash /home/ubuntu/seta-hp/scripts/monitor.sh >> /var/log/monitor.log 2>&1
0 4 * * * root bash /home/ubuntu/seta-hp/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
17 3,15 * * * root bash /home/ubuntu/seta-hp/scripts/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
```

SSL更新は1日2回動かします（Let's Encryptが実際に更新するのは残り30日を切った証明書だけ）。
月1回では1度の失敗がそのまま失効につながるためです。各スクリプトを `bash` 経由で呼ぶのは、
デプロイが `scripts/` をgitから再展開するので実行ビットに依存させないためです。
`monitor.sh` は配信中のTLS証明書の残日数も監視し、既定で20日を切ると通知します
（`MONITOR_CERT_MIN_DAYS` で変更、`0` で無効）。ファイルではなく実際に配信中の証明書を見るため、
更新漏れだけでなく「更新はできたがNginxをreloadし損ねた」ケースも検知できます。

**証明書更新のジョブは必ず1つに統一してください。** 個人crontab（`crontab -e` / `sudo crontab -e`）に
同種のジョブを追加すると `/etc/cron.d/server-monitoring` と二重に走ります。特に certbot を直接
叩くジョブは危険で、過去に次の形で失効事故が起きています:

```bash
# 悪い例: ubuntuユーザーのcrontabから root所有(644)の /var/log/certbot-renew.log へ追記している
0 3 1,15 * * ... certbot renew --quiet && ... nginx -s reload >> /var/log/certbot-renew.log 2>&1
```

`A && B >> file` のリダイレクトは **B にしか掛かりません**。ログへ書けないユーザーで実行すると
`certbot renew`（更新）は成功する一方 `nginx -s reload` だけが実行されず、Nginxは起動時に読んだ
古い証明書を配信し続けたまま失効します。`setup-monitoring.sh` は実行時にこの種の重複ジョブを
検出して警告します。

Designerが別パスの場合は `DESIGNER_PROJECT_DIR`、`DESIGNER_ENV_FILE`、`DESIGNER_COMPOSE_FILE` で指定できます。意図的に対象外にする場合だけ、バックアップは `BACKUP_DESIGNER=0`、監視は `MONITOR_DESIGNER=0` を設定します。監視動作だけを確認するときは `MONITOR_SEND_EMAIL=0` で通知を抑止できます。

## 事業者情報

- **ブランド名**: 飾Love(かざらぶ)
- **運営事業者(屋号)**: 瀬田製作所(個人事業所)
- **設立**: 2023年8月8日
- **所在地**: 富山県高岡市
- **Email**: info@kaza-love.com

## ライセンス

このプロジェクトの著作権は運営事業者(瀬田製作所)に帰属します。
