import { appTimezone } from '../common/config.js';
import {
  formatDate,
  formatDateTime,
  formatTime,
  relativeDays,
} from '../common/dates.js';
import { escapeHtml } from '../common/labels.js';
import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import type { AppNotification } from './app-notification.js';

const ICON: Record<string, string> = {
  VACCINE: '💉',
  DEWORMING_INTERNAL: '🪱',
  DEWORMING_EXTERNAL: '🛡️',
  BATH: '🛁',
  HAIRCUT: '✂️',
  NAIL_TRIM: '💅',
  DENTAL_CLEANING: '🦷',
};

const icon = (item: UpcomingItem) => ICON[item.type] ?? '•';

function when(item: UpcomingItem): string {
  const rel = relativeDays(item.daysUntil);
  return item.daysUntil < 0 ? `venció ${rel}` : rel;
}

export function upcomingLine(item: UpcomingItem): string {
  const rel = when(item);
  const whenHtml = item.daysUntil <= 1 ? `<b>${rel}</b>` : rel;
  const what =
    item.kind === 'HEALTH'
      ? `${escapeHtml(item.title)} <i>(${item.subtitle.toLowerCase()})</i>`
      : escapeHtml(item.title);
  const overdue = item.daysUntil < 0 ? '⚠️ ' : '';
  return `${overdue}${icon(item)} <b>${escapeHtml(item.petName)}</b> — ${what}: ${whenHtml} (${formatDate(item.dueDate)})`;
}

/** Línea en texto plano para notificaciones push. */
export function upcomingPlainLine(item: UpcomingItem): string {
  const what =
    item.kind === 'HEALTH' ? `${item.title} (${item.subtitle.toLowerCase()})` : item.title;
  return `${item.daysUntil < 0 ? '⚠️' : icon(item)} ${item.petName} · ${what}: ${when(item)}`;
}

export function upcomingDigest(items: UpcomingItem[]): AppNotification {
  const health = items.filter((i) => i.kind === 'HEALTH');
  const grooming = items.filter((i) => i.kind === 'GROOMING');
  const parts = ['🐾 <b>Theo’s App · Recordatorios</b>'];
  if (health.length) {
    parts.push('', '<b>Vacunas y desparasitaciones</b>', ...health.map(upcomingLine));
  }
  if (grooming.length) {
    parts.push('', '<b>Higiene</b>', ...grooming.map(upcomingLine));
  }

  const lines = items.slice(0, 4).map(upcomingPlainLine);
  if (items.length > 4) lines.push(`y ${items.length - 4} más…`);
  const single = items.length === 1 ? items[0] : null;
  return {
    title: single
      ? `${icon(single)} ${single.petName}: ${single.title}`
      : `🐾 ${items.length} recordatorios de cuidado`,
    body: single ? upcomingPlainLine(single).replace(/^\S+ /, '') : lines.join('\n'),
    html: parts.join('\n'),
    url: single?.kind === 'GROOMING' ? '/higiene' : single ? '/vacunas' : '/',
    tag: 'recordatorios',
    ttl: 12 * 3600,
  };
}

export function doseMessage(t: {
  id: number;
  medicineName: string;
  dosage: string;
  pet: { name: string };
  doseNumber: number;
  totalDoses: number;
  at: Date;
  notes?: string | null;
}): AppNotification {
  const time = formatTime(t.at, appTimezone());
  return {
    title: `💊 Medicamento de ${t.pet.name}`,
    body: [`${t.medicineName} — ${t.dosage}`, `Toma ${t.doseNumber} de ${t.totalDoses} · ${time}`, t.notes]
      .filter(Boolean)
      .join('\n'),
    html: [
      `💊 <b>Hora del medicamento de ${escapeHtml(t.pet.name)}</b>`,
      `${escapeHtml(t.medicineName)} — ${escapeHtml(t.dosage)}`,
      `Toma ${t.doseNumber} de ${t.totalDoses} · ${time}`,
      t.notes ? `<i>${escapeHtml(t.notes)}</i>` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    url: '/tratamientos',
    tag: `toma-${t.id}`,
    ttl: 30 * 60,
    urgency: 'high',
  };
}

export function treatmentFinishedMessage(t: {
  medicineName: string;
  pet: { name: string };
}): AppNotification {
  return {
    title: '✅ Tratamiento terminado',
    body: `${t.medicineName} de ${t.pet.name}`,
    html: `✅ Terminó el tratamiento de <b>${escapeHtml(t.medicineName)}</b> de <b>${escapeHtml(t.pet.name)}</b>.`,
    url: '/tratamientos',
    ttl: 24 * 3600,
  };
}

export function activeTreatmentsMessage(
  treatments: Array<{
    medicineName: string;
    dosage: string;
    pet: { name: string };
    progress: { nextDoseAt: Date | null; dosesElapsed: number; totalDoses: number };
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
