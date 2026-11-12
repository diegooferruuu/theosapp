import {
  doseTimes,
  dueDoseIndex,
  treatmentEnd,
  treatmentProgress,
} from './schedule.js';

const start = new Date('2026-11-12T12:00:00Z');
const t = { startAt: start, durationDays: 7, frequencyHours: 8 };
const at = (h: number) => new Date(start.getTime() + h * 3_600_000);

describe('schedule', () => {
  it('calcula todas las tomas', () => {
    const doses = doseTimes(t);
    expect(doses).toHaveLength(21);
    expect(doses[0]).toEqual(start);
    expect(doses[20]).toEqual(at(160));
    expect(treatmentEnd(t)).toEqual(at(168));
  });

  it('redondea hacia arriba cuando la frecuencia no divide la duración', () => {
    expect(
      doseTimes({ startAt: start, durationDays: 5, frequencyHours: 36 }),
    ).toHaveLength(4);
  });

  it('informa progreso y próxima toma', () => {
    const p = treatmentProgress(t, at(9));
    expect(p.dosesElapsed).toBe(2);
    expect(p.nextDoseNumber).toBe(3);
    expect(p.nextDoseAt).toEqual(at(16));
    expect(treatmentProgress(t, at(200)).nextDoseAt).toBeNull();
  });

  it('solo marca una toma como pendiente de aviso dentro del margen', () => {
    expect(dueDoseIndex(t, at(-1))).toBeNull();
    expect(dueDoseIndex(t, at(0))).toBe(0);
    expect(dueDoseIndex(t, at(8.25))).toBe(1);
    expect(dueDoseIndex(t, at(9))).toBeNull(); // pasó el margen de 30 min
  });
});
