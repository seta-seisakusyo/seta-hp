# ===== ビルドステージ =====
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"

# 依存関係を先にコピー（キャッシュが効く）
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Prisma スキーマをコピーして generate
COPY prisma ./prisma
RUN npx prisma generate

# ソースコードをコピーしてビルド
COPY . .

# NEXT_PUBLIC_* はビルド時に存在すればインライン展開され、実行時の環境変数より優先される。
# 静的生成ページ（/about, /company, /legal, /privacy-policy, /shipping）のHTMLは
# ここで確定するため、ビルド時に渡さないと実行時に .env を与えても反映されない（#128）。
# 未指定なら空のまま＝計測タグを描画しない。
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=""
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID

RUN yarn build

# ===== 本番ステージ（軽量）=====
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# standalone出力をコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
# 画像最適化(next/image)に必要な sharp とネイティブ依存(@img)を runtime に同梱（#196）。
# standalone のトレースに依存せず確実にコピーする。
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img

EXPOSE 3000
CMD ["node", "server.js"]
