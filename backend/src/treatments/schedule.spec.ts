import {
  asNeededStatus,
  currentDose,
  doseAt,
  doseNumberAtOrBefore,
  dueDoseNumber,
  scheduleWindow,
  totalDoses,
  treatmentEnd,
  treatmentProgress,
  type TreatmentTiming,
} from './schedule.js';

const TZ = 'America/La_Paz'; // UTC-4
const H = 3_600_000;

describe('cada X horas', () => {
  const start = new Date('2026-11-12T12:00:00Z');
  const t: TreatmentTiming = {
    scheduleType: 'INTERVAL',
    startAt: start,
    durationDays: 7,
    frequencyHours: 8,
    times: [],
    everyDays: 1,
  };
  const at = (h: number) => new Date(start.getTime() + h * H);

  it('calcula todas las tomas y el fin', () => {
    expect(totalDoses(t)).toBe(21);
    expect(doseAt(t, 1, TZ)).toEqual(start);
    expect(doseAt(t, 21, TZ)).toEqual(at(160));
    expect(doseAt(t, 22, TZ)).toBeNull();
    expect(treatmentEnd(t, TZ)).toEqual(at(168));
  });

  it('progreso, toma actual y recordatorio', () => {
    expect(treatmentProgress(t, at(9), TZ)).toMatchObject({
      dosesElapsed: 2,
      nextDoseNumber: 3,
    });
    expect(currentDose(t, at(-3), TZ)).toMatchObject({
      number: 1,
      canGive: false,
    });
    expect(currentDose(t, at(7.5), TZ)).toMatchObject({
      number: 2,
      canGive: true,
    });
    expect(currentDose(t, at(500), TZ)).toMatchObject({ number: 21 });
    expect(dueDoseNumber(t, at(8.25), 30, TZ)).toBe(2);
    expect(dueDoseNumber(t, at(9), 30, TZ)).toBeNull();
  });

  it('sin fecha de fin sigue indefinidamente', () => {
    const c = { ...t, durationDays: null };
    expect(totalDoses(c)).toBeNull();
    expect(treatmentEnd(c, TZ)).toBeNull();
    expect(doseAt(c, 1000, TZ)).toEqual(at(999 * 8));
  });
});

describe('horarios fijos (hora de La Paz)', () => {
  // Empieza el 12 nov, a las 08:00 y 20:00 locales (12:00 y 00:00 UTC).
  const t: TreatmentTiming = {
    scheduleType: 'FIXED_TIMES',
    startAt: new Date('2026-11-12T04:00:00Z'), // 00:00 en La Paz
    durationDays: 3,
    frequencyHours: null,
    times: ['20:00', '08:00'],
    everyDays: 1,
  };

  it('ordena las horas y las convierte a la zona horaria', () => {
    expect(totalDoses(t)).toBe(6);
    expect(doseAt(t, 1, TZ)).toEqual(new Date('2026-11-12T12:00:00Z'));
    expect(doseAt(t, 2, TZ)).toEqual(new Date('2026-11-13T00:00:00Z'));
    expect(doseAt(t, 6, TZ)).toEqual(new Date('2026-11-15T00:00:00Z'));
    expect(treatmentEnd(t, TZ)).toEqual(new Date('2026-11-15T04:00:00Z'));
  });

  it('encuentra la toma actual', () => {
    expect(doseNumberAtOrBefore(t, new Date('2026-11-13T13:00:00Z'), TZ)).toBe(
      3,
    );
    expect(doseNumberAtOrBefore(t, new Date('2026-12-30T00:00:00Z'), TZ)).toBe(
      6,
    );
    expect(currentDose(t, new Date('2026-11-12T11:30:00Z'), TZ)).toMatchObject({
      number: 1,
      canGive: true,
    });
  });

  it('cada 3 días, sin fin', () => {
    const c: TreatmentTiming = {
      ...t,
      times: ['09:00'],
      everyDays: 3,
      durationDays: null,
    };
    expect(doseAt(c, 2, TZ)).toEqual(new Date('2026-11-15T13:00:00Z'));
    expect(doseNumberAtOrBefore(c, new Date('2026-11-17T12:00:00Z'), TZ)).toBe(
      2,
    );
    expect(
      scheduleWindow(c, new Date('2026-11-17T12:00:00Z'), TZ).partial,
    ).toBe(true);
  });
});

describe('según necesidad', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const ago = (h: number) => new Date(now.getTime() - h * H);

  it('respeta el intervalo mínimo', () => {
    const s = asNeededStatus(
      { minIntervalHours: 8, maxPerDay: null },
      [ago(3)],
      now,
    );
    expect(s).toMatchObject({ canGive: false, reason: 'interval' });
    expect(s.nextAllowedAt).toEqual(new Date(now.getTime() + 5 * H));
    expect(
      asNeededStatus({ minIntervalHours: 8, maxPerDay: null }, [ago(9)], now)
        .canGive,
    ).toBe(true);
  });

  it('respeta el máximo diario', () => {
    const s = asNeededStatus(
      { minIntervalHours: 2, maxPerDay: 3 },
      [ago(20), ago(10), ago(4)],
      now,
    );
    expect(s).toMatchObject({ canGive: false, reason: 'max', last24h: 3 });
    expect(s.nextAllowedAt).toEqual(new Date(now.getTime() + 4 * H));
  });

  it('sin dosis previas se puede dar', () => {
    expect(
      asNeededStatus({ minIntervalHours: 6, maxPerDay: 2 }, [], now).canGive,
    ).toBe(true);
  });
});
