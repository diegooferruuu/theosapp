import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import {
  doseGivenMessage,
  doseMessage,
  pendingDoseMessage,
  upcomingDigest,
} from './messages.js';

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

const treatment = {
  id: 7,
  medicineName: 'Amoxicilina',
  dosage: '5 ml',
  pet: { name: 'Theo' },
};

describe('mensajes de aviso', () => {
  it('un solo recordatorio: título con la mascota y enlace a su sección', () => {
    const n = upcomingDigest([item({})]);
    expect(n.title).toBe('💉 Theo: Antirrábica');
    expect(n.body).toBe('Theo · Antirrábica (vacuna): mañana');
    expect(n.url).toBe('/vacunas');
  });

  it('varios recordatorios: resumen y vencidos marcados', () => {
    const n = upcomingDigest([
      item({ id: 1, daysUntil: -2 }),
      item({
        id: 2,
        kind: 'GROOMING',
        type: 'BATH',
        title: 'Baño',
        subtitle: 'Higiene',
        daysUntil: 3,
      }),
    ]);
    expect(n.title).toBe('🐾 2 recordatorios de cuidado');
    expect(n.body.split('\n')).toEqual([
      '⚠️ Theo · Antirrábica (vacuna): venció hace 2 días',
      '🛁 Theo · Baño: en 3 días',
    ]);
    expect(n.url).toBe('/');
  });

  it('recordatorio de toma: urgente, corto y pide marcarla', () => {
    const n = doseMessage({
      ...treatment,
      type: 'PILL',
      instructions: 'Triturada en la comida',
      doseNumber: 3,
      totalDoses: 21,
      at: new Date('2026-11-12T12:00:00Z'),
    });
    expect(n.title).toBe('💊 Medicamento de Theo');
    expect(n.body).toContain('Toma 3 de 21 · 08:00');
    expect(n.body).toContain('Triturada en la comida');
    expect(n.body).toContain('márcalo como dado');
    expect(n).toMatchObject({ urgency: 'high', ttl: 1800, tag: 'toma-7' });
  });

  it('limpieza: textos propios y sin total si es continua', () => {
    const n = doseGivenMessage({
      ...treatment,
      type: 'CLEANING',
      medicineName: 'Otoclean',
      dosage: 'Limpieza de oídos',
      doseNumber: 5,
      totalDoses: null,
      givenAt: new Date('2026-11-12T23:00:00Z'),
      givenBy: 'Diego',
    });
    expect(n.title).toBe('✅ Limpieza de Theo hecha');
    expect(n.body).toBe(
      'Otoclean — Limpieza de oídos · toma 5\nLo hizo Diego a las 19:00.',
    );
  });

  it('toma dada: dice quién y a qué hora, y reemplaza al recordatorio', () => {
    const n = doseGivenMessage({
      ...treatment,
      doseNumber: 3,
      totalDoses: 21,
      givenAt: new Date('2026-11-12T12:05:00Z'),
      givenBy: 'Mamá',
    });
    expect(n.title).toBe('✅ Theo ya tomó su medicamento');
    expect(n.body).toContain('Se la dio Mamá a las 08:05');
    expect(n.tag).toBe('toma-7');
  });

  it('toma pendiente: pregunta y reemplaza al recordatorio', () => {
    const n = pendingDoseMessage({
      ...treatment,
      doseNumber: 2,
      totalDoses: 14,
      at: new Date('2026-11-12T12:00:00Z'),
    });
    expect(n.title).toBe('⚠️ ¿Ya le dieron su medicamento a Theo?');
    expect(n.body).toContain('Nadie marcó la toma 2 de 14 de las 08:00');
    expect(n).toMatchObject({ tag: 'toma-7', urgency: 'high' });
  });
});
