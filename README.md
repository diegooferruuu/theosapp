# Theo’s App 🐾

PWA de uso familiar para gestionar la salud y los cuidados de las mascotas de la casa, con recordatorios por Telegram.

**Fase 1 (implementada):** módulo veterinario + usuarios.

| Módulo | Qué hace | Alertas por Telegram |
|---|---|---|
| Vacunas y desparasitación | Tipo, producto, fecha de aplicación, próxima fecha, notas. Botón *Renovar* que mantiene el intervalo. | 1 semana antes, 1 día antes, el mismo día (y un aviso si quedó vencida) |
| Tratamientos | Medicamento, dosis, inicio, duración, frecuencia, estado. Calcula cada toma. | En el horario de cada toma (si el tratamiento está activo) y al finalizar |
| Higiene y estética | Baño, corte de pelo, uñas, limpieza dental; próximo turno. | 3 días antes |
| Visitas y peso | Visitas al veterinario (motivo, diagnóstico, peso) y gráfico de peso. | — |
| Usuarios | Login, superadmin inicial, alta/edición/baja de usuarios, perfil propio, vinculación con Telegram. | — |

## Estructura

```
backend/    NestJS 12 + Prisma 7 (PostgreSQL), cron jobs y bot de Telegram
frontend/   Next.js 16 (App Router) + Tailwind 4, PWA
nginx/      Proxy: /api → backend, resto → frontend
docker-compose.yml
```

## Usuarios y permisos

- Al arrancar, si no existe ningún superadmin, el backend crea uno con `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` (por defecto `diego`). Cambia la contraseña desde **Mi perfil** tras el primer acceso.
- **Superadmin:** todo lo anterior + gestionar usuarios (crear, editar, desactivar, eliminar, cambiar rol), eliminar mascotas y forzar la revisión de alertas.
- **Usuario:** ver y registrar todo lo del módulo veterinario, editar su perfil y vincular su Telegram.
- La sesión es un JWT en cookie `httpOnly` (30 días por defecto). Cambiar la contraseña, desactivar un usuario o cambiarle el rol cierra sus sesiones.

## Notificaciones push (PWA)

Cada persona las activa en **Mi perfil → Notificaciones en este dispositivo**. Llegan los mismos avisos que por Telegram (recordatorios diarios, cada toma de medicamento y fin de tratamiento), aunque la app esté cerrada. Al tocar una notificación se abre la sección correspondiente.

- Requieren HTTPS.
- **iPhone (iOS 16.4+):** primero hay que instalar la app (*Compartir → Añadir a pantalla de inicio*) y activarlas desde ahí.
- **Android y escritorio:** se activan desde el navegador.
- Las claves VAPID se generan solas la primera vez y se guardan en la base (`app_settings`). Si se prefiere, se pueden fijar con `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
- Los dispositivos que desinstalan la app o revocan el permiso se eliminan solos.

## Bot de Telegram

1. Crea un bot con [@BotFather](https://t.me/BotFather) y copia el token en `TELEGRAM_BOT_TOKEN`.
2. Cada persona entra a **Mi perfil → Vincular Telegram**: se abre el bot, toca *Iniciar* y queda vinculada.
3. Comandos del bot: `/proximos`, `/tratamientos`, `/id`, `/ayuda` (solo responden a chats vinculados).

Sin token, la app funciona igual y los mensajes se escriben en el log del backend.

**Cómo se envían las alertas.** Cada 15 minutos el backend revisa vencimientos y, a partir de `DAILY_ALERT_HOUR`, envía un único resumen con todo lo pendiente. Cada aviso se registra en `notification_logs`, así que nunca se repite aunque el servidor se reinicie, y si el servidor estuvo apagado a la hora del aviso, se envía en la siguiente revisión. Las tomas de medicamentos se revisan cada minuto. Si una vacuna se *renueva* (nuevo registro del mismo producto), la anterior deja de generar avisos.

## Producción

### Servidor actual (Oracle Cloud, Ubuntu ARM)

```
~/theosapp/
├── .env          configuración y secretos de producción (no está en git)
├── deploy.sh     script de despliegue (copia de scripts/server-deploy.sh)
├── app/          versión desplegada
├── app.old/      versión anterior (para volver atrás)
└── deploy.log    historial de despliegues
```

- URL: **https://theo.152-67-46-104.sslip.io**.
- El HTTPS lo da el Caddy del proyecto *alertas*, que ya ocupa los puertos 80 y 443. Al final de `~/alertas/deploy/Caddyfile` hay un bloque `theo.152-67-46-104.sslip.io { reverse_proxy theosapp-nginx:80 }`.
- `~/theosapp/docker-compose.override.yml`, que solo existe en el servidor y que `deploy.sh` aplica, hace dos cosas:
  - une el nginx de Theo a la red `alertas-beta_default` con el alias `theosapp-nginx`;
  - deja el puerto 18473 escuchando solo en `127.0.0.1`, para la comprobación de salud.
- La base de datos, el backend y el frontend no se exponen ni se conectan a la red de alertas.
- Proyecto Compose `theosapp`, con red y volumen propios.

### Despliegue automático (GitHub Actions)

Cada push a `main` ejecuta tests, tipos y lint. Si pasan, el workflow envía el código al servidor por SSH y `deploy.sh` reconstruye el stack. Si la API no responde, vuelve a la versión anterior. También se puede lanzar a mano desde *Actions → Deploy → Run workflow*.

Configuración en *Settings → Secrets and variables → Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `DEPLOY_SSH_KEY` | clave privada de deploy (`~/.ssh/theosapp_deploy` en tu Mac) |
| Variable | `DEPLOY_HOST` | IP del servidor |
| Variable | `DEPLOY_USER` | `ubuntu` |
| Variable | `DEPLOY_KNOWN_HOSTS` | línea de `ssh-keyscan -t ed25519 <IP>` |

La clave de deploy está registrada en el servidor con `restrict,command="…/deploy.sh"`: solo puede ejecutar el despliegue, sin shell ni túneles.

Despliegue manual desde tu Mac (mismo mecanismo):

```bash
git archive --format=tar.gz HEAD | ssh oracle '~/theosapp/deploy.sh'
```

### Otro servidor

```bash
./scripts/init-env.sh        # crea .env con secretos aleatorios
nano .env                    # HTTP_PORT, APP_URL, TELEGRAM_BOT_TOKEN, COOKIE_SECURE…
docker compose up -d --build
```

- Las migraciones se aplican solas al arrancar el backend.
- **HTTPS:** para instalar la PWA en el iPhone y usar cookies seguras hace falta HTTPS. Pon un certificado delante de Nginx (Caddy, certbot, Cloudflare Tunnel…) y define `COOKIE_SECURE=true` y `APP_URL=https://…`.
- Copia de seguridad de la base: `docker compose -p theosapp exec db pg_dump -U theo theosapp > backup.sql`

## Desarrollo local

Requisitos: Node 24, PostgreSQL (local o en Docker).

```bash
# Base de datos de desarrollo (puerto 5433 para no chocar con otras)
docker run -d --name theo-db -e POSTGRES_USER=theo -e POSTGRES_PASSWORD=theo -e POSTGRES_DB=theosapp -p 5433:5432 postgres:17-alpine

# Backend → http://localhost:3001/api
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# Frontend → http://localhost:3000 (proxy de /api al backend)
cd frontend
npm install
npm run dev
```

Tests de la lógica de fechas, alertas y tomas: `cd backend && npm test`.

### API

Todas las rutas van bajo `/api` y requieren sesión salvo `POST /auth/login` y `GET /health`.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Perfil | `GET/PATCH /profile`, `POST /profile/password`, `GET/DELETE /profile/telegram`, `POST /profile/telegram/link`, `POST /profile/telegram/test` |
| Usuarios (superadmin) | `GET/POST /users`, `PATCH/DELETE /users/:id` |
| Mascotas | `GET/POST /pets`, `GET/PATCH /pets/:id`, `DELETE /pets/:id` (superadmin) |
| Vacunas/desparasitación | `GET/POST /health-records`, `PATCH/DELETE /health-records/:id` (filtros `petId`, `type`) |
| Tratamientos | `GET/POST /treatments`, `GET /treatments/:id/schedule`, `PATCH/DELETE /treatments/:id` |
| Higiene | `GET/POST /grooming`, `PATCH/DELETE /grooming/:id` |
| Visitas | `GET/POST /vet-visits`, `PATCH/DELETE /vet-visits/:id` |
| Peso | `GET/POST /weights`, `PATCH/DELETE /weights/:id` |
| Resumen | `GET /dashboard` |
| Notificaciones (superadmin) | `GET /notifications/logs`, `POST /notifications/run-daily` |

## Próximas fases (no implementadas)

- **Fase 2 – NFC y comida:** endpoints silenciosos para Atajos de iOS (registrar comidas y dosis en tiempo real).
- **Fase 3 – Widgets:** endpoint JSON seguro para Scriptable.
