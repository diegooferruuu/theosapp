import { appointmentBucket } from './reminders.js';

const at = new Date('2026-11-20T14:30:00Z');
const before = (h: number) => new Date(at.getTime() - h * 3_600_000);

describe('avisos de citas', () => {
  it('día antes, 2 h antes y después', () => {
    expect(appointmentBucket(at, before(30))).toBeNull();
    expect(appointmentBucket(at, before(24))).toBe('day');
    expect(appointmentBucket(at, before(3))).toBe('day');
    expect(appointmentBucket(at, before(2))).toBe('soon');
    expect(appointmentBucket(at, before(0.1))).toBe('soon');
    expect(appointmentBucket(at, before(-0.5))).toBeNull();
    expect(appointmentBucket(at, before(-1))).toBe('after');
    expect(appointmentBucket(at, before(-49))).toBeNull();
  });
});
