#!/bin/sh
set -e

CERT_PATH="/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem"

# 環境変数を展開
envsubst '${SERVER_NAME} ${OLD_SERVER_NAME}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# 共通proxy設定は include に集約し、各locationでは差分だけを定義する。
cat > /etc/nginx/conf.d/proxy_headers.inc <<'EOFINC'
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
EOFINC

cat > /etc/nginx/conf.d/proxy_timeouts.inc <<'EOFINC'
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
EOFINC

# Designer API/Django adminで共有する認証境界。
# nginx変数は実行時評価のためエスケープし、共有秘密だけentrypointで展開する。
cat > /etc/nginx/conf.d/designer_authenticated_backend.inc << EOFINC
auth_request /__auth;
auth_request_set \$auth_email \$upstream_http_x_user_email;
proxy_pass \$designer_back;
include /etc/nginx/conf.d/proxy_headers.inc;
# HPセッションCookieはDesignerへ渡さず、Designer自身のcsrf/sessionだけを保持する。
proxy_set_header Cookie \$designer_cookie;
# クライアント供給値を上書きし、認証済みユーザーと共有秘密だけを下流へ渡す。
proxy_set_header X-Remote-User \$auth_email;
proxy_set_header X-SSO-Auth "${PROXY_SSO_SECRET}";
EOFINC

# HTTPS/HTTP fallbackで共通の静的アセットlocation。serverコンテキストからincludeする。
cat > /etc/nginx/conf.d/site_static_locations.inc <<'EOFINC'
location /uploads/ {
    alias /var/www/uploads/;
    expires 30d;
    add_header X-Content-Type-Options "nosniff" always;
}

location /_next/static/ {
    proxy_pass http://next_app:3000;
    include /etc/nginx/conf.d/proxy_headers.inc;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
EOFINC

# --- 管理エリアIP制限の allow リストを生成（#248） ---
# ADMIN_ALLOWED_IPS: スペース区切りの IP/CIDR（例: "203.0.113.10 198.51.100.0/24"）。
# 未設定なら "allow all" となり従来挙動（制限なし）。IP変更でロックアウトした場合は
# VPS に SSH して .env の ADMIN_ALLOWED_IPS を更新 → nginx 再起動で復旧できる。
# ※ 拡張子 .inc は conf.d/*.conf の自動読込対象外（include 専用）。
ADMIN_ALLOW_CONF=/etc/nginx/conf.d/admin_allow.inc
if [ -n "${ADMIN_ALLOWED_IPS:-}" ]; then
    echo "# generated from ADMIN_ALLOWED_IPS" > "$ADMIN_ALLOW_CONF"
    for ip in $ADMIN_ALLOWED_IPS; do
        echo "allow $ip;" >> "$ADMIN_ALLOW_CONF"
    done
    echo "deny all;" >> "$ADMIN_ALLOW_CONF"
    echo "Admin IP allowlist enabled: $ADMIN_ALLOWED_IPS"
else
    echo "allow all;" > "$ADMIN_ALLOW_CONF"
    echo "ADMIN_ALLOWED_IPS is not set. Admin area is NOT IP-restricted."
fi

# SSL証明書が存在する場合、HTTPS設定を追加
if [ -f "$CERT_PATH" ]; then
    echo "SSL certificate found. Enabling HTTPS..."
    cat >> /etc/nginx/conf.d/default.conf << EOFCONF

# レート制限ゾーン定義
limit_req_zone \$binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone \$binary_remote_addr zone=upload:10m rate=120r/m;
# designer 用（未認証フラッドが auth_request を過負荷にするのを抑止。対話ツールなので緩め）。
limit_req_zone \$binary_remote_addr zone=designer:10m rate=15r/s;

# Designer upstream へ渡す前に HP の SSO セッションCookieを除去するフィルタ。
# designer 自身の csrftoken / sessionid は残し、HPのJWT Cookieだけ落とす。
# secure/非secure 名、および Auth.js のchunk(.0/.1…)を「連続する複数個まとめて」除去する
# （末尾の "+" が連続chunkに対応）。現状のJWTサイズではchunkは発生しない想定だが将来耐性として。
map \$http_cookie \$designer_cookie {
    default \$http_cookie;
    "~*^(.*?)(?:(?:__Secure-)?kazalove\.session-token(?:\.[0-9]+)?=[^;]*;?\s*)+(.*)\$" "\$1\$2";
}

# 逆向き: HP の verify-admin(/__auth) へは「HPのSSO Cookie(全chunk)だけ」を渡す。
# designer 自身の sessionid/csrftoken を HP 側に漏らさないための境界。
map \$http_cookie \$sso_only_cookie {
    default "";
    "~*(?:^|;\s*)((?:(?:__Secure-)?kazalove\.session-token(?:\.[0-9]+)?=[^;]*;?\s*)+)" "\$1";
}

# HTTPS メインサイト (kaza-love.com)
server {
    listen 443 ssl;
    server_name ${SERVER_NAME};

    ssl_certificate /etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SERVER_NAME}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers on;

    # セキュリティヘッダー（HSTS / X-Frame-Options / X-Content-Type-Options /
    # Referrer-Policy / Permissions-Policy / CSP）は Next 側 next.config.ts の
    # headers() に一本化している（旧: ここと二重付与で HSTS の max-age も食い違っていた）。
    # 直配信の /uploads には MIME スニフ防止のみ各ロケーションで付与する。

    client_max_body_size 10M;

    # IP制限（allow/deny）で拒否した際の案内ページ（#254）。
    # error_page は nginx 自身が生成した 403 のみ差し替える
    # （proxy_intercept_errors は使わないため、アプリが返す 403 はそのまま通る）。
    # 制限理由（IP制限であること）は攻撃者へのヒントになるため文言に含めない。
    error_page 403 = @access_denied;
    location @access_denied {
        default_type text/html;
        return 403 "<!doctype html><html lang=ja><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>アクセスできません | 飾Love</title><body style='margin:0;font-family:\"Helvetica Neue\",Arial,\"Hiragino Kaku Gothic ProN\",Meiryo,sans-serif;background:#FFFFFF;color:#0A0A0A;display:flex;min-height:100vh;align-items:center;justify-content:center'><div style='max-width:32rem;padding:2rem;text-align:center'><div style='font-size:12px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#B45309;margin-bottom:1rem'>Access Restricted</div><h1 style='font-size:1.5rem;font-weight:700;letter-spacing:-.02em;margin:0 0 1rem'>アクセスできません</h1><p style='font-size:.9rem;line-height:1.9;color:#6B6B6B;margin:0 0 2rem'>このページはご利用の環境からは表示できません。<br>お探しの商品・情報はトップページからご覧いただけます。</p><a href='/' style='display:inline-block;background:#0A0A0A;color:#FFFFFF;padding:.75rem 1.75rem;border-radius:999px;font-size:.85rem;font-weight:600;text-decoration:none'>トップページへ →</a></div></body></html>";
    }

    # --- 管理エリアのIP制限（#248） ---
    # ADMIN_ALLOWED_IPS 未設定時は admin_allow.inc が "allow all;" となり制限なし。
    # 管理ページ＋ログイン/登録ページ（#251: 一般ユーザーのログイン運用が無いため
    # 認証エリアごと制限し、攻撃者はログイン試行自体が不可能）。
    # アプリ側 middleware / requireAdminOrEditor と併せて三層防御。
    location ~ ^/(products-manage|gallery-manage|news|login|register)(/|\$) {
        include /etc/nginx/conf.d/admin_allow.inc;
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    # 設計ツール連携API（#322）はサーバー間通信専用。designer-backend は Docker ネットワーク内で
    # next_app:3000 を直接呼ぶので、nginx 経由（外部）からは一切通さない（多層防御）。
    location ^~ /api/integrations/ {
        return 404;
    }

    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    # 認証APIのIP制限（#251）。signin/callback/csrf 等を許可IPに限定し
    # ログイン試行自体を遮断する。/api/auth/session のみ公開
    # （全ページのヘッダが参照する読み取り専用。未ログインは null 応答のみ）。
    # ※ designer の auth_request(verify-admin) は nginx 内部で next_app へ直接
    #   proxy するためこの制限の影響を受けない。
    location = /api/auth/session {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    location /api/auth/ {
        include /etc/nginx/conf.d/admin_allow.inc;
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    # ユーザー登録APIもIP制限（#251: ログインと同じく一般利用なし）
    location = /api/register {
        include /etc/nginx/conf.d/admin_allow.inc;
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    # 商品/制作事例/お知らせAPI: GET(公開)以外の書込メソッドのみIP制限（#248）
    location ~ ^/api/(products|works|news)\$ {
        limit_req zone=api burst=10 nodelay;
        limit_except GET {
            include /etc/nginx/conf.d/admin_allow.inc;
        }
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    # 問い合わせAPI: POST(フォーム送信)は公開、GET/DELETE(管理)のみIP制限（#248）
    location = /api/email {
        limit_req zone=api burst=10 nodelay;
        limit_except POST {
            include /etc/nginx/conf.d/admin_allow.inc;
        }
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    # 画像アップロードは管理専用APIのため全体をIP制限（#248）
    location = /api/upload {
        include /etc/nginx/conf.d/admin_allow.inc;
        limit_req zone=upload burst=20 nodelay;
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    include /etc/nginx/conf.d/site_static_locations.inc;

    # next/image 最適化エンドポイント（#196）。多数のサムネイルを読み込むギャラリー等で
    # 一般レート制限(zone=general)に当たらないよう専用 location でプロキシする。
    # Cache-Control は Next 側が付与する（images.minimumCacheTTL）。
    location /_next/image {
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
    }

    # public/ 直下の静的アセット（ロゴ・favicon・og-image 等）に長期キャッシュを付与。
    # ルート直下のファイルのみに限定し、/uploads/ や /_next/static/ は侵さない。
    location ~* ^/[^/]+\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?)\$ {
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=604800" always;
        add_header X-Content-Type-Options "nosniff" always;
    }
}

# www・旧ドメイン → kaza-love.com リダイレクト (HTTPS)
server {
    listen 443 ssl;
    server_name www.${SERVER_NAME} ${OLD_SERVER_NAME} www.${OLD_SERVER_NAME};

    ssl_certificate /etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SERVER_NAME}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    return 301 https://${SERVER_NAME}\$request_uri;
}

# designer.kaza-love.com（飾Love Designer / HP管理者ログインでSSOゲート）
server {
    listen 443 ssl;
    server_name designer.${SERVER_NAME};

    ssl_certificate /etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SERVER_NAME}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers on;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    # CSP: designer フロントは外部リソース依存ゼロ（CDN/外部フォント/Worker無し）を確認済。
    # Next の hydration 用に script/style は unsafe-inline/eval を許可、画像生成用に data:/blob:。
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" always;

    client_max_body_size 20M;

    # Designer は別composeスタック。落ちていても HP nginx 起動を妨げないよう
    # Docker埋め込みDNS(127.0.0.11)で実行時解決する（未起動時は502を返すだけ）。
    resolver 127.0.0.11 valid=30s ipv6=off;
    set \$designer_front http://designer-frontend:3000;
    set \$designer_back  http://designer-backend:8000;

    # 未ログイン(401)→HPログイン / 権限不足(403)→専用メッセージ で分ける。
    error_page 401 = @to_login;
    error_page 403 = @forbidden;
    location @to_login {
        return 302 https://${SERVER_NAME}/login;
    }
    location @forbidden {
        default_type text/html;
        return 403 "<!doctype html><meta charset=utf-8><title>403 Forbidden</title><body style='font-family:sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.7'><h1>アクセス権限がありません</h1><p>このツールは管理者(ADMIN)アカウントのみ利用できます。別の権限でログインしている場合は、管理者アカウントでログインし直してください。</p><p><a href='https://${SERVER_NAME}/'>トップへ戻る</a></p></body>";
    }

    # auth_request: HP の管理者検証。Cookie は HP の SSO Cookie だけに絞って渡す
    # （designer 自身の sessionid/csrftoken を HP 側へ渡さない＝Cookie境界を明確化）。
    location = /__auth {
        internal;
        proxy_pass http://next_app:3000/api/auth/verify-admin;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header Host ${SERVER_NAME};
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Cookie \$sso_only_cookie;
    }

    # Designer API（同一オリジン → CORS不要）。
    location /api/ {
        limit_req zone=designer burst=30 nodelay;
        include /etc/nginx/conf.d/designer_authenticated_backend.inc;
        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    # Django admin（到達者は全員HPのADMIN。SSO側で is_staff/superuser を付与済み）。
    location /admin/ {
        limit_req zone=designer burst=30 nodelay;
        include /etc/nginx/conf.d/designer_authenticated_backend.inc;
    }

    # Django / DRF の静的ファイル。Cookie不要なので全除去。
    location /static/ {
        limit_req zone=designer burst=30 nodelay;
        auth_request /__auth;
        proxy_pass \$designer_back;
        include /etc/nginx/conf.d/proxy_headers.inc;
        proxy_set_header Cookie "";
    }

    # Designer フロント（UIもゲート）。HPのCookieは一切渡さない。
    location / {
        limit_req zone=designer burst=30 nodelay;
        auth_request /__auth;
        proxy_pass \$designer_front;
        include /etc/nginx/conf.d/proxy_headers.inc;
        proxy_set_header Cookie "";
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }
}
EOFCONF
else
    echo "SSL certificate not found. Running HTTP only..."
    cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name ${SERVER_NAME} ${OLD_SERVER_NAME} www.${SERVER_NAME} www.${OLD_SERVER_NAME};

    client_max_body_size 10M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # 設計ツール連携API（#322）はサーバー間通信専用。designer-backend は Docker ネットワーク内で
    # next_app:3000 を直接呼ぶので、nginx 経由（外部）からは一切通さない（多層防御）。
    location ^~ /api/integrations/ {
        return 404;
    }

    location = /api/upload {
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }


    location / {
        proxy_pass http://next_app:3000;
        include /etc/nginx/conf.d/proxy_headers.inc;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        include /etc/nginx/conf.d/proxy_timeouts.inc;
    }

    include /etc/nginx/conf.d/site_static_locations.inc;
}
EOF
fi

if [ "${NGINX_TEST_ONLY:-0}" = "1" ]; then
    exec nginx -t
fi

exec nginx -g 'daemon off;'
