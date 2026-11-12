/** Zona horaria usada para fechas, cron y mensajes. */
export function appTimezone(): string {
  return process.env.TZ || 'America/La_Paz';
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
