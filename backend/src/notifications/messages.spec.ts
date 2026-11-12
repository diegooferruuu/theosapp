import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import { doseMessage, upcomingDigest } from './messages.js';

const item = (over: Partial<UpcomingItem>): UpcomingItem => ({
  kind: 'HEALTH',
  id: 1,
  type: 'VACCINE',
  petId: 1,
  petName: 'Theo',
  title: 'Antirrábica',
  subtitle: 'Vacuna',
  dueDate: '2026-11-13',
  daysUntil: 1,
  status: 'SOON',
  ...over,
});

describe('mensajes de aviso', () => {
  it('un solo recordatorio: título con la mascota y enlace a su sección', () => {
    const n = upcomingDigest([item({})]);
    expect(n.title).toBe('💉 Theo: Antirrábica');
    expect(n.body).toBe('Theo · Antirrábica (vacuna): mañana');
    expect(n.url).toBe('/vacunas');
    expect(n.html).toContain('<b>mañana</b>');
  });

  it('varios recordatorios: resumen y vencidos marcados', () => {
    const items = [
      item({ id: 1, daysUntil: -2 }),
      item({ id: 2, kind: 'GROOMING', type: 'BATH', title: 'Baño', subtitle: 'Higiene', daysUntil: 3 }),
    ];
    const n = upcomingDigest(items);
    expect(n.title).toBe('🐾 2 recordatorios de cuidado');
    expect(n.body.split('\n')).toEqual([
      '⚠️ Theo · Antirrábica (vacuna): venció hace 2 días',
      '🛁 Theo · Baño: en 3 días',
    ]);
    expect(n.url).toBe('/');
  });

  it('toma de medicamento: urgente y de corta duración', () => {
    const n = doseMessage({
      id: 7,
      medicineName: 'Amoxicilina',
      dosage: '5 ml',
      pet: { name: 'Theo' },
      doseNumber: 3,
      totalDoses: 21,
      at: new Date('2026-11-12T12:00:00Z'),
    });
    expect(n.title).toBe('💊 Medicamento de Theo');
    expect(n.body).toBe('Amoxicilina — 5 ml\nToma 3 de 21 · 08:00');
    expect(n).toMatchObject({ urgency: 'high', ttl: 1800, tag: 'toma-7' });
  });
});
