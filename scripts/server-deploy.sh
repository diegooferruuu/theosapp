#!/usr/bin/env bash
# Despliegue en el servidor.
#
# Recibe el código como .tar.gz por la entrada estándar (git archive), lo instala
# en $THEOSAPP_HOME/app y reconstruye el stack con Docker Compose. Si la API no
# responde tras el arranque, vuelve a la versión anterior.
#
#   git archive --format=tar.gz HEAD | ssh servidor ~/theosapp/deploy.sh
#
# Es el comando forzado de la clave SSH de GitHub Actions (authorized_keys).
set -euo pipefail

BASE="${THEOSAPP_HOME:-$HOME/theosapp}"
APP="$BASE/app"
PROJECT="theosapp"
ENV_FILE="$BASE/.env"

mkdir -p "$BASE"
exec > >(tee -a "$BASE/deploy.log") 2>&1
echo "──── Deploy $(date -Is) ────"

exec 9>"$BASE/.deploy.lock"
flock -n 9 || { echo "Hay otro deploy en curso"; exit 1; }

[ -f "$ENV_FILE" ] || { echo "Falta $ENV_FILE (ver README)"; exit 1; }
PORT="$(grep -E '^HTTP_PORT=' "$ENV_FILE" | cut -d= -f2)"

# 1) Descomprimir la nueva versión
rm -rf "$BASE/app.new"
mkdir -p "$BASE/app.new"
tar -xzf - -C "$BASE/app.new"
[ -f "$BASE/app.new/docker-compose.yml" ] || { echo "Paquete inválido"; exit 1; }

# 2) Rotar versiones (se conserva la anterior para volver atrás)
rm -rf "$BASE/app.old"
[ -d "$APP" ] && mv "$APP" "$BASE/app.old"
mv "$BASE/app.new" "$APP"

# Actualiza este mismo script para el próximo deploy (rename atómico).
cp "$APP/scripts/server-deploy.sh" "$BASE/deploy.sh.tmp"
chmod 755 "$BASE/deploy.sh.tmp"
mv "$BASE/deploy.sh.tmp" "$BASE/deploy.sh"

# Ajustes propios del servidor (no versionados), p. ej. unir nginx a la red de otro proxy.
OVERRIDE="$BASE/docker-compose.override.yml"
compose() {
  local files=(-f docker-compose.yml)
  [ -f "$OVERRIDE" ] && files+=(-f "$OVERRIDE")
  (cd "$APP" && docker compose --env-file "$ENV_FILE" -p "$PROJECT" "${files[@]}" "$@")
}

up() {
  compose up -d --build --remove-orphans
}

healthy() {
  for _ in $(seq 1 60); do
    curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 && return 0
    sleep 3
  done
  return 1
}

# 3) Construir y arrancar
if up && healthy; then
  docker image prune -f --filter "label=com.docker.compose.project=${PROJECT}" >/dev/null || true
  echo "✔ Deploy correcto: http://127.0.0.1:${PORT}"
  exit 0
fi

echo "✘ La nueva versión no respondió."
compose logs --tail 80 backend || true
if [ -d "$BASE/app.old" ]; then
  echo "↩ Volviendo a la versión anterior…"
  rm -rf "$BASE/app.failed"
  mv "$APP" "$BASE/app.failed"
  mv "$BASE/app.old" "$APP"
  up && healthy && echo "Versión anterior restaurada."
fi
exit 1
