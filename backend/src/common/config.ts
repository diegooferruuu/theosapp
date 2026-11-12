/** Zona horaria usada para fechas, cron y mensajes. */
export function appTimezone(): string {
  return process.env.TZ || 'America/La_Paz';
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Carpeta donde se guardan las fotos subidas (volumen en Docker). */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || `${process.cwd()}/uploads`;
}

/** Carpeta de las fotos del diario de síntomas. */
export function symptomPhotosDir(): string {
  return `${uploadDir()}/symptoms`;
}
