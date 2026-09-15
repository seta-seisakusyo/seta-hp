#!/bin/bash
# SSL証明書更新スクリプト
# Let's Encrypt は残り30日を切った証明書だけを実際に更新するため、毎日走らせて構わない。
# 逆に実行間隔が月1回だと1度の失敗がそのまま失効につながるため、1日2回を推奨する。
# cron設定例: 17 3,15 * * * bash /home/ubuntu/seta-hp/scripts/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# COMPOSE_FILE等の環境変数に左右されないよう、デプロイと同じく構成ファイルを明示する。
compose() { docker compose -f docker-compose.yml "$@"; }

echo "=========================================="
echo "SSL証明書更新開始: $(date)"
echo "=========================================="

if compose run --rm certbot renew --webroot -w /var/www/certbot --quiet; then
    # certbot renew は更新不要の場合も成功するため、安全のため毎回設定を再読込する。
    echo "証明書の確認完了。Nginxをリロードします..."
    # Nginxは起動/reload時にしか証明書を読まない。更新できてもreloadを取りこぼすと
    # 古い証明書を配信し続けたまま失効するため、ここは黙って失敗させない。
    if compose exec -T nginx nginx -s reload; then
        echo "Nginxリロード完了"
    else
        echo "ERROR: Nginxのリロードに失敗しました。証明書は更新済みですが、" >&2
        echo "       Nginxは古い証明書を配信し続けます。手動で reload してください。" >&2
        exit 1
    fi
else
    echo "証明書更新処理に失敗しました" >&2
    exit 1
fi

echo "=========================================="
echo "SSL証明書更新終了: $(date)"
echo "=========================================="
