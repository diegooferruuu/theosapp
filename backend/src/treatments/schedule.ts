const HOUR_MS = 3_600_000;

export interface TreatmentTiming {
  startAt: Date;
  durationDays: number;
  frequencyHours: number;
}

/** Calcula las fechas/horas exactas de cada toma del tratamiento. */
export function doseTimes(t: TreatmentTiming): Date[] {
  const total = Math.max(
    1,
    Math.ceil((t.durationDays * 24) / t.frequencyHours),
  );
  const start = t.startAt.getTime();
  return Array.from(
    { length: total },
    (_, i) => new Date(start + i * t.frequencyHours * HOUR_MS),
  );
}

export function treatmentEnd(t: TreatmentTiming): Date {
  return new Date(t.startAt.getTime() + t.durationDays * 24 * HOUR_MS);
}

export function treatmentProgress(t: TreatmentTiming, now = new Date()) {
  const doses = doseTimes(t);
  const dosesElapsed = doses.filter((d) => d <= now).length;
  return {
    totalDoses: doses.length,
    dosesElapsed,
    nextDoseAt: doses[dosesElapsed] ?? null,
    nextDoseNumber: dosesElapsed < doses.length ? dosesElapsed + 1 : null,
    lastDoseAt: doses[doses.length - 1],
    endAt: treatmentEnd(t),
  };
}

/**
 * Toma que corresponde notificar ahora: la más reciente cuya hora ya llegó
 * y no hace más de `graceMinutes`. Devuelve su índice (0-based) o null.
 */
export function dueDoseIndex(
  t: TreatmentTiming,
  now = new Date(),
  graceMinutes = 30,
): number | null {
  const doses = doseTimes(t);
  for (let i = doses.length - 1; i >= 0; i--) {
    const diff = now.getTime() - doses[i].getTime();
    if (diff < 0) continue;
    return diff <= graceMinutes * 60_000 ? i : null;
  }
  return null;
}
