#!/usr/bin/env bash
# Создаёт deploy/.env со случайными секретами. Запускать один раз на сервере из каталога deploy/.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  echo ".env уже существует — удалите его вручную, если точно нужно пересоздать (секреты сменятся, сессии слетят)."
  exit 1
fi

read -rp "Домен сайта (Enter — пока без домена, по IP): " DOMAIN
read -rp "Email владельца (super admin админки и админ Grafana): " OWNER
read -rsp "Пароль владельца: " OWNER_PW
echo

hex() { openssl rand -hex "$1"; }

# хеш пароля для ADMIN_USERS — тем же scrypt, что в apps/admin/scripts/hash-password.mjs
OWNER_HASH=$(docker run --rm -e PW="$OWNER_PW" -e EMAIL="$OWNER" node:22-alpine node -e '
const c = require("crypto");
const s = c.randomBytes(16);
const h = c.scryptSync(process.env.PW, s, 32);
process.stdout.write(process.env.EMAIL.trim().toLowerCase() + "=scrypt:" + s.toString("base64") + ":" + h.toString("base64"));
')

if [ -n "$DOMAIN" ]; then
  SITE_ADDRESS="$DOMAIN"
  PUBLIC_ORIGIN="https://$DOMAIN"
else
  IP=$(hostname -I | awk '{print $1}')
  SITE_ADDRESS=":80"
  PUBLIC_ORIGIN="http://$IP"
fi

umask 077
cat > .env <<EOF
# Сгенерировано gen-env.sh $(date -Iseconds). Не коммитить.
SITE_ADDRESS=$SITE_ADDRESS
PUBLIC_ORIGIN=$PUBLIC_ORIGIN

POSTGRES_PASSWORD=$(hex 24)
ADMIN_API_TOKEN=$(hex 24)
AUTH_TOKEN_SECRET=$(hex 32)
AUDIT_INGEST_TOKEN=$(hex 24)
ADMIN_SESSION_SECRET=$(hex 32)

ADMIN_USERS=$OWNER_HASH

GRAFANA_ADMIN_USER=$OWNER
GRAFANA_ADMIN_PASSWORD='$OWNER_PW'
EOF

echo "Готово: deploy/.env (права 600). Сайт будет на $PUBLIC_ORIGIN"
