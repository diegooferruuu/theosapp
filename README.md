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

## Bot de Telegram

1. Crea un bot con [@BotFather](https://t.me/BotFather) y copia el token en `TELEGRAM_BOT_TOKEN`.
2. Cada persona entra a **Mi perfil → Vincular Telegram**: se abre el bot, toca *Iniciar* y queda vinculada.
3. Comandos del bot: `/proximos`, `/tratamientos`, `/id`, `/ayuda` (solo responden a chats vinculados).

Sin token, la app funciona igual y los mensajes se escriben en el log del backend.

**Cómo se envían las alertas.** Cada 15 minutos el backend revisa vencimientos y, a partir de `DAILY_ALERT_HOUR`, envía un único resumen con todo lo pendiente. Cada aviso se registra en `notification_logs`, así que nunca se repite aunque el servidor se reinicie, y si el servidor estuvo apagado a la hora del aviso, se envía en la siguiente revisión. Las tomas de medicamentos se revisan cada minuto. Si una vacuna se *renueva* (nuevo registro del mismo producto), la anterior deja de generar avisos.

## Producción (Docker Compose, p. ej. Oracle Linux)

```bash
./scripts/init-env.sh        # crea .env con secretos aleatorios
nano .env                    # APP_URL, TELEGRAM_BOT_TOKEN, COOKIE_SECURE…
docker compose up -d --build
```

- La app queda en `http://<servidor>:${HTTP_PORT}`. Las migraciones se aplican solas al arrancar el backend.
- **HTTPS:** para instalar la PWA en el iPhone y usar cookies seguras hace falta HTTPS. Pon un certificado delante de Nginx (certbot en el host, Cloudflare Tunnel, Caddy…) y define `COOKIE_SECURE=true` y `APP_URL=https://…`.
- En Oracle Linux recuerda abrir el puerto en `firewalld` y en la *Security List* de OCI.
- Copia de seguridad de la base: `docker compose exec db pg_dump -U theo theosapp > backup.sql`

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
