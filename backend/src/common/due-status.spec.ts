import { daysBetween, hourIn, todayIn } from './dates.js';
import { computeDue, normalizeName, supersededIds } from './due-status.js';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('fechas', () => {
  it('usa la zona horaria configurada', () => {
    // 02:30 UTC del 12 nov = 22:30 del 11 nov en La Paz (UTC-4)
    const now = new Date('2026-11-12T02:30:00Z');
    expect(todayIn('America/La_Paz', now)).toBe('2026-11-11');
    expect(hourIn('America/La_Paz', now)).toBe(22);
    expect(daysBetween('2026-11-11', '2026-11-18')).toBe(7);
  });
});

describe('computeDue', () => {
  const today = '2026-11-11';
  it('clasifica según los días restantes', () => {
    expect(computeDue(d('2026-11-10'), today, false).status).toBe('OVERDUE');
    expect(computeDue(d('2026-11-11'), today, false).status).toBe('TODAY');
    expect(computeDue(d('2026-11-18'), today, false).status).toBe('SOON');
    expect(computeDue(d('2026-11-19'), today, false).status).toBe('UPCOMING');
    expect(computeDue(d('2026-11-14'), today, false, 3)).toEqual({
      status: 'SOON',
      daysUntil: 3,
    });
    expect(computeDue(null, today, false).status).toBe('NONE');
    expect(computeDue(d('2026-11-10'), today, true).status).toBe('DONE');
  });
});

describe('supersededIds', () => {
  it('marca como reemplazados los registros anteriores del mismo grupo', () => {
    const records = [
      { id: 1, key: normalizeName('Séxtuple'), date: d('2025-01-01') },
      { id: 2, key: normalizeName('sextuple '), date: d('2026-01-01') },
      { id: 3, key: normalizeName('Antirrábica'), date: d('2025-06-01') },
    ];
    const done = supersededIds(
      records,
      (r) => r.key,
      (r) => r.date,
    );
    expect([...done]).toEqual([1]);
  });
});
