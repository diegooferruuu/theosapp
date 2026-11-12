const HOUR = 3_600_000;

export type AppointmentBucket = 'day' | 'soon' | 'after';

/**
 * Qué aviso toca para una cita:
 *  - 'day'   : desde 24 h antes (o al agendarla, si falta menos) hasta 2 h antes.
 *  - 'soon'  : las últimas 2 h antes de la cita.
 *  - 'after' : de 1 h a 48 h después, si aún no se registró el resultado.
 */
export function appointmentBucket(
  scheduledAt: Date,
  now = new Date(),
): AppointmentBucket | null {
  const diff = scheduledAt.getTime() - now.getTime();
  if (diff > 2 * HOUR && diff <= 24 * HOUR) return 'day';
  if (diff > 0 && diff <= 2 * HOUR) return 'soon';
  if (diff <= -1 * HOUR && diff > -48 * HOUR) return 'after';
  return null;
}
