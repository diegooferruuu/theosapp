import { daysBetween, toDateOnly } from './dates.js';

export type DueStatus =
  | 'OVERDUE' // vencido
  | 'TODAY' // toca hoy
  | 'SOON' // dentro de la ventana de aviso
  | 'UPCOMING' // al día
  | 'DONE' // reemplazado por un registro más reciente
  | 'NONE'; // sin próxima fecha

export interface DueInfo {
  status: DueStatus;
  daysUntil: number | null;
}

export function computeDue(
  nextDueDate: Date | null,
  today: string,
  superseded: boolean,
  soonDays = 7,
): DueInfo {
  if (!nextDueDate)
    return { status: superseded ? 'DONE' : 'NONE', daysUntil: null };
  const daysUntil = daysBetween(today, toDateOnly(nextDueDate));
  if (superseded) return { status: 'DONE', daysUntil };
  if (daysUntil < 0) return { status: 'OVERDUE', daysUntil };
  if (daysUntil === 0) return { status: 'TODAY', daysUntil };
  if (daysUntil <= soonDays) return { status: 'SOON', daysUntil };
  return { status: 'UPCOMING', daysUntil };
}

/**
 * Devuelve los ids de registros que ya fueron reemplazados por uno más reciente
 * del mismo grupo (p. ej. misma mascota + misma vacuna).
 */
export function supersededIds<T extends { id: number }>(
  records: T[],
  groupKey: (r: T) => string,
  dateOf: (r: T) => Date,
): Set<number> {
  const latest = new Map<string, T>();
  for (const r of records) {
    const key = groupKey(r);
    const current = latest.get(key);
    if (
      !current ||
      dateOf(r).getTime() > dateOf(current).getTime() ||
      (dateOf(r).getTime() === dateOf(current).getTime() && r.id > current.id)
    ) {
      latest.set(key, r);
    }
  }
  const keep = new Set([...latest.values()].map((r) => r.id));
  return new Set(records.filter((r) => !keep.has(r.id)).map((r) => r.id));
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
