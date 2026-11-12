const DAY_MS = 86_400_000;

/** Convierte 'YYYY-MM-DD' en Date a medianoche UTC (columnas @db.Date). */
export function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

/** Date (columna @db.Date) → 'YYYY-MM-DD'. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Fecha de hoy ('YYYY-MM-DD') en la zona horaria indicada. */
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Hora actual (0-23) en la zona horaria indicada. */
export function hourIn(timeZone: string, now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
}

/** Días enteros entre dos fechas 'YYYY-MM-DD' (to - from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return toDateOnly(new Date(Date.parse(date) + days * DAY_MS));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateOnly(date) : date;
  return new Intl.DateTimeFormat('es', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('es', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function relativeDays(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  return days > 0 ? `en ${days} días` : `hace ${-days} días`;
}

/** Diferencia (ms) entre la hora local de `timeZone` y UTC en ese instante. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instante que corresponde a la fecha 'YYYY-MM-DD' y hora 'HH:MM' en `timeZone`. */
export function zonedDateTime(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffsetMs(new Date(guess), timeZone);
  // Segunda pasada por si el cambio de horario cae en medio.
  return new Date(guess - tzOffsetMs(new Date(first), timeZone));
}
