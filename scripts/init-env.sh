#!/usr/bin/env sh
# Crea .env a partir de .env.example con secretos aleatorios.
set -eu
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env ya existe; no se modifica." >&2
  exit 1
fi

rand() { openssl rand -hex "$1"; }

sed \
  -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(rand 24)/" \
  -e "s/^JWT_SECRET=.*/JWT_SECRET=$(rand 32)/" \
  -e "s/^SUPERADMIN_PASSWORD=.*/SUPERADMIN_PASSWORD=$(rand 8)/" \
  .env.example > .env
chmod 600 .env

echo "Listo: .env creado. Revisa APP_URL, COOKIE_SECURE y TELEGRAM_BOT_TOKEN."
echo "La contraseña inicial del superadmin está en SUPERADMIN_PASSWORD dentro de .env."
