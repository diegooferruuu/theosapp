import { groomingBucket, healthBucket } from './alerts.js';

describe('ventanas de aviso', () => {
  it('vacunas: semana, día anterior, mismo día y vencido', () => {
    expect(healthBucket(8)).toBeNull();
    expect(healthBucket(7)).toBe('week');
    expect(healthBucket(2)).toBe('week');
    expect(healthBucket(1)).toBe('day');
    expect(healthBucket(0)).toBe('today');
    expect(healthBucket(-3)).toBe('overdue');
    expect(healthBucket(-8)).toBeNull();
  });

  it('higiene: 3 días antes', () => {
    expect(groomingBucket(4)).toBeNull();
    expect(groomingBucket(3)).toBe('soon');
    expect(groomingBucket(0)).toBe('soon');
    expect(groomingBucket(-1)).toBeNull();
  });
});
