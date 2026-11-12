import {
  appointmentCreatedMessage,
  appointmentReminderMessage,
} from '../notifications/messages.js';

const a = {
  id: 9,
  scheduledAt: new Date('2026-11-20T14:30:00Z'), // 10:30 en La Paz
  reason: 'Control anual',
  vetName: 'Dr. Pérez',
  location: 'Clínica San Roque',
  notes: 'Ir en ayunas',
  pet: { name: 'Theo' },
};

describe('mensajes de citas', () => {
  it('al agendar avisa con fecha y quién la agendó', () => {
    const n = appointmentCreatedMessage({ ...a, createdBy: 'Mamá' });
    expect(n.title).toContain('📅 Cita para Theo');
    expect(n.body).toContain('La agendó Mamá');
    expect(n.url).toBe('/visitas?cita=9');
  });

  it('2 h antes: urgente, con preparación y síntomas pendientes', () => {
    const n = appointmentReminderMessage(a, 'soon', 2);
    expect(n.title).toBe('⏰ En menos de 2 horas: cita de Theo');
    expect(n.body).toContain(
      'Control anual · 10:30 · Dr. Pérez · Clínica San Roque',
    );
    expect(n.body).toContain('Recuerda: Ir en ayunas');
    expect(n.body).toContain('2 síntomas anotados');
    expect(n.urgency).toBe('high');
  });

  it('después: pide registrar el resultado', () => {
    const n = appointmentReminderMessage(a, 'after');
    expect(n.title).toBe('🩺 ¿Cómo fue la cita de Theo?');
    expect(n.body).toContain('si le recetaron algo');
  });
});
