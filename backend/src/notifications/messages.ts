import { appTimezone } from '../common/config.js';
import {
  formatDate,
  formatDateTime,
  formatTime,
  relativeDays,
} from '../common/dates.js';
import { escapeHtml } from '../common/labels.js';
import type { UpcomingItem } from '../dashboard/dashboard.service.js';

const ICON: Record<string, string> = {
  VACCINE: '💉',
  DEWORMING_INTERNAL: '🪱',
  DEWORMING_EXTERNAL: '🛡️',
  BATH: '🛁',
  HAIRCUT: '✂️',
  NAIL_TRIM: '💅',
  DENTAL_CLEANING: '🦷',
};

export function upcomingLine(item: UpcomingItem): string {
  const when =
    item.daysUntil <= 1 && item.daysUntil >= 0
      ? `<b>${relativeDays(item.daysUntil)}</b>`
      : relativeDays(item.daysUntil);
  const what =
    item.kind === 'HEALTH'
      ? `${escapeHtml(item.title)} <i>(${item.subtitle.toLowerCase()})</i>`
      : escapeHtml(item.title);
  const overdue = item.daysUntil < 0 ? '⚠️ ' : '';
  return `${overdue}${ICON[item.type] ?? '•'} <b>${escapeHtml(item.petName)}</b> — ${what}: ${when} (${formatDate(item.dueDate)})`;
}

export function upcomingDigest(items: UpcomingItem[]): string {
  const health = items.filter((i) => i.kind === 'HEALTH');
  const grooming = items.filter((i) => i.kind === 'GROOMING');
  const parts = ['🐾 <b>Theo’s App · Recordatorios</b>'];
  if (health.length) {
    parts.push(
      '',
      '<b>Vacunas y desparasitaciones</b>',
      ...health.map(upcomingLine),
    );
  }
  if (grooming.length) {
    parts.push('', '<b>Higiene</b>', ...grooming.map(upcomingLine));
  }
  return parts.join('\n');
}

export function doseMessage(t: {
  medicineName: string;
  dosage: string;
  pet: { name: string };
  doseNumber: number;
  totalDoses: number;
  at: Date;
  notes?: string | null;
}): string {
  return [
    `💊 <b>Hora del medicamento de ${escapeHtml(t.pet.name)}</b>`,
    `${escapeHtml(t.medicineName)} — ${escapeHtml(t.dosage)}`,
    `Toma ${t.doseNumber} de ${t.totalDoses} · ${formatTime(t.at, appTimezone())}`,
    t.notes ? `<i>${escapeHtml(t.notes)}</i>` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function treatmentFinishedMessage(t: {
  medicineName: string;
  pet: { name: string };
}): string {
  return `✅ Terminó el tratamiento de <b>${escapeHtml(t.medicineName)}</b> de <b>${escapeHtml(t.pet.name)}</b>.`;
}

export function activeTreatmentsMessage(
  treatments: Array<{
    medicineName: string;
    dosage: string;
    pet: { name: string };
    progress: {
      nextDoseAt: Date | null;
      dosesElapsed: number;
      totalDoses: number;
    };
  }>,
): string {
  if (!treatments.length) return '💊 No hay tratamientos activos.';
  const tz = appTimezone();
  return [
    '💊 <b>Tratamientos activos</b>',
    ...treatments.map((t) => {
      const next = t.progress.nextDoseAt
        ? `próxima toma ${formatDateTime(t.progress.nextDoseAt, tz)}`
        : 'sin tomas pendientes';
      return `• <b>${escapeHtml(t.pet.name)}</b>: ${escapeHtml(t.medicineName)} ${escapeHtml(t.dosage)} — ${next} (${t.progress.dosesElapsed}/${t.progress.totalDoses})`;
    }),
  ].join('\n');
}
