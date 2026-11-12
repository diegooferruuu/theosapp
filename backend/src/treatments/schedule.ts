import { appTimezone } from '../common/config.js';
import {
  addDays,
  daysBetween,
  todayIn,
  zonedDateTime,
} from '../common/dates.js';

const HOUR_MS = 3_600_000;

/** Minutos antes de la hora en que ya se puede marcar una toma como dada. */
export const EARLY_GIVE_MINUTES = 60;

export type ScheduleKind = 'INTERVAL' | 'FIXED_TIMES' | 'AS_NEEDED';

export interface TreatmentTiming {
  scheduleType: ScheduleKind;
  /** INTERVAL: primera toma. FIXED_TIMES: medianoche (hora local) del primer día. */
  startAt: Date;
  /** null = sin fecha de fin. */
  durationDays: number | null;
  /** INTERVAL: cada cuántas horas. */
  frequencyHours: number | null;
  /** FIXED_TIMES: horas del día 'HH:MM'. */
  times: string[];
  /** FIXED_TIMES: cada cuántos días (1 = todos los días). */
  everyDays: number;
}

export const isScheduled = (t: TreatmentTiming) =>
  t.scheduleType !== 'AS_NEEDED';

const sortedTimes = (t: TreatmentTiming) => [...t.times].sort();
const startDate = (t: TreatmentTiming, tz: string) => todayIn(tz, t.startAt);

/** Número total de tomas, o null si no tiene fin (o es según necesidad). */
export function totalDoses(t: TreatmentTiming): number | null {
  if (t.scheduleType === 'INTERVAL' && t.frequencyHours && t.durationDays) {
    return Math.max(1, Math.ceil((t.durationDays * 24) / t.frequencyHours));
  }
  if (t.scheduleType === 'FIXED_TIMES' && t.times.length && t.durationDays) {
    return (
      Math.ceil(t.durationDays / Math.max(1, t.everyDays)) * t.times.length
    );
  }
  return null;
}

/** Fecha y hora de la toma número `n` (1 = primera), o null si no existe. */
export function doseAt(
  t: TreatmentTiming,
  n: number,
  tz = appTimezone(),
): Date | null {
  if (n < 1 || !isScheduled(t)) return null;
  const total = totalDoses(t);
  if (total !== null && n > total) return null;
  if (t.scheduleType === 'INTERVAL') {
    if (!t.frequencyHours) return null;
    return new Date(t.startAt.getTime() + (n - 1) * t.frequencyHours * HOUR_MS);
  }
  const times = sortedTimes(t);
  if (!times.length) return null;
  const day = Math.floor((n - 1) / times.length) * Math.max(1, t.everyDays);
  return zonedDateTime(
    addDays(startDate(t, tz), day),
    times[(n - 1) % times.length],
    tz,
  );
}

/** Última toma cuya hora es <= instant (0 si aún no hubo ninguna). */
export function doseNumberAtOrBefore(
  t: TreatmentTiming,
  instant: Date,
  tz = appTimezone(),
): number {
  if (!isScheduled(t)) return 0;
  const total = totalDoses(t);
  if (t.scheduleType === 'INTERVAL') {
    if (!t.frequencyHours || instant < t.startAt) return 0;
    const n =
      Math.floor(
        (instant.getTime() - t.startAt.getTime()) /
          (t.frequencyHours * HOUR_MS),
      ) + 1;
    return total === null ? n : Math.min(n, total);
  }
  const times = sortedTimes(t);
  if (!times.length) return 0;
  const days = daysBetween(startDate(t, tz), todayIn(tz, instant));
  if (days < 0) return 0;
  const every = Math.max(1, t.everyDays);
  let block = Math.floor(days / every);
  if (total !== null)
    block = Math.min(block, Math.ceil(total / times.length) - 1);
  for (let b = block; b >= Math.max(0, block - 1); b--) {
    for (let i = times.length - 1; i >= 0; i--) {
      const n = b * times.length + i + 1;
      const at = doseAt(t, n, tz);
      if (at && at <= instant) return n;
    }
  }
  return 0;
}

/** Fin del tratamiento, o null si no tiene fecha de fin. */
export function treatmentEnd(
  t: TreatmentTiming,
  tz = appTimezone(),
): Date | null {
  if (!t.durationDays) return null;
  if (t.scheduleType === 'FIXED_TIMES') {
    return zonedDateTime(
      addDays(startDate(t, tz), t.durationDays),
      '00:00',
      tz,
    );
  }
  return new Date(t.startAt.getTime() + t.durationDays * 24 * HOUR_MS);
}

export function treatmentProgress(
  t: TreatmentTiming,
  now = new Date(),
  tz = appTimezone(),
) {
  const total = totalDoses(t);
  const elapsed = doseNumberAtOrBefore(t, now, tz);
  const nextAt = doseAt(t, elapsed + 1, tz);
  return {
    totalDoses: total,
    dosesElapsed: elapsed,
    nextDoseAt: nextAt,
    nextDoseNumber: nextAt ? elapsed + 1 : null,
    endAt: treatmentEnd(t, tz),
  };
}

/**
 * Toma "actual": la más reciente cuya hora ya llegó (o llega dentro de la
 * ventana de anticipación). Antes de empezar, la primera toma.
 * null para tratamientos "según necesidad".
 */
export function currentDose(
  t: TreatmentTiming,
  now = new Date(),
  tz = appTimezone(),
) {
  if (!isScheduled(t)) return null;
  const limit = new Date(now.getTime() + EARLY_GIVE_MINUTES * 60_000);
  const number = Math.max(1, doseNumberAtOrBefore(t, limit, tz));
  const at = doseAt(t, number, tz);
  if (!at) return null;
  return { number, at, canGive: at <= limit };
}

/**
 * Toma que corresponde recordar ahora: la más reciente cuya hora ya llegó y
 * no hace más de `graceMinutes`. Devuelve su número o null.
 */
export function dueDoseNumber(
  t: TreatmentTiming,
  now = new Date(),
  graceMinutes = 30,
  tz = appTimezone(),
): number | null {
  const n = doseNumberAtOrBefore(t, now, tz);
  const at = doseAt(t, n, tz);
  if (!at) return null;
  return now.getTime() - at.getTime() <= graceMinutes * 60_000 ? n : null;
}

/** Tomas a mostrar en el horario: todas si son pocas; si no, una ventana alrededor de hoy. */
export function scheduleWindow(
  t: TreatmentTiming,
  now = new Date(),
  tz = appTimezone(),
) {
  const total = totalDoses(t);
  let from = 1;
  let to = total ?? 0;
  if (total === null || total > 120) {
    const current = Math.max(1, doseNumberAtOrBefore(t, now, tz));
    from = Math.max(1, current - 9);
    to = total === null ? current + 30 : Math.min(total, current + 30);
  }
  const doses: { number: number; at: Date }[] = [];
  for (let n = from; n <= to; n++) {
    const at = doseAt(t, n, tz);
    if (at) doses.push({ number: n, at });
  }
  return { doses, partial: from > 1 || total === null || to < total };
}

export interface AsNeededRules {
  minIntervalHours: number | null;
  maxPerDay: number | null;
}

/** Si ahora se puede dar una dosis "según necesidad" y, si no, desde cuándo. */
export function asNeededStatus(
  rules: AsNeededRules,
  givenAt: Date[],
  now = new Date(),
): {
  canGive: boolean;
  nextAllowedAt: Date | null;
  reason: 'interval' | 'max' | null;
  last24h: number;
} {
  const dayAgo = now.getTime() - 24 * HOUR_MS;
  const recent = givenAt
    .filter((d) => d.getTime() > dayAgo)
    .sort((a, b) => a.getTime() - b.getTime());
  const last = givenAt.reduce<Date | null>(
    (acc, d) => (!acc || d > acc ? d : acc),
    null,
  );

  let nextAllowed: Date | null = null;
  let reason: 'interval' | 'max' | null = null;
  if (rules.minIntervalHours && last) {
    const byInterval = new Date(
      last.getTime() + rules.minIntervalHours * HOUR_MS,
    );
    if (byInterval > now) {
      nextAllowed = byInterval;
      reason = 'interval';
    }
  }
  if (rules.maxPerDay && recent.length >= rules.maxPerDay) {
    // Se libera cuando la dosis más antigua de las últimas 24 h cumple un día.
    const byMax = new Date(
      recent[recent.length - rules.maxPerDay].getTime() + 24 * HOUR_MS,
    );
    if (!nextAllowed || byMax > nextAllowed) {
      nextAllowed = byMax;
      reason = 'max';
    }
  }
  return {
    canGive: nextAllowed === null,
    nextAllowedAt: nextAllowed,
    reason,
    last24h: recent.length,
  };
}
