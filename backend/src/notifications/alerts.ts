/**
 * Ventanas de aviso.
 *  - Vacunas / desparasitaciones: 1 semana antes, 1 día antes, el mismo día
 *    (y un único aviso si quedó vencido en la última semana).
 *  - Higiene: un aviso simple 3 días antes.
 * Se usan ventanas (no días exactos) para que un reinicio del servidor o un
 * registro creado tarde no haga perder el aviso; NotificationLog evita duplicados.
 */
export type HealthBucket = 'week' | 'day' | 'today' | 'overdue';

export function healthBucket(daysUntil: number): HealthBucket | null {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'day';
  if (daysUntil >= 2 && daysUntil <= 7) return 'week';
  if (daysUntil < 0 && daysUntil >= -7) return 'overdue';
  return null;
}

export function groomingBucket(daysUntil: number): 'soon' | null {
  return daysUntil >= 0 && daysUntil <= 3 ? 'soon' : null;
}
