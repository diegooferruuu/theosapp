import { appTimezone } from '../common/config.js';
import {
  formatTime,
  relativeDays,
  todayIn,
  toDateOnly,
  daysBetween,
} from '../common/dates.js';
import { HEALTH_TYPE_LABEL } from '../common/labels.js';
import type { UpcomingItem } from '../dashboard/dashboard.service.js';
import type { AppNotification } from '../notifier/app-notification.js';

const ICON: Record<string, string> = {
  VACCINE: '💉',
  DEWORMING_INTERNAL: '🪱',
  DEWORMING_EXTERNAL: '🛡️',
  BATH: '🛁',
  HAIRCUT: '✂️',
  NAIL_TRIM: '💅',
  DENTAL_CLEANING: '🦷',
};

const icon = (type: string) => ICON[type] ?? '•';

function when(item: UpcomingItem): string {
  const rel = relativeDays(item.daysUntil);
  return item.daysUntil < 0 ? `venció ${rel}` : rel;
}

export function upcomingLine(item: UpcomingItem): string {
  const what =
    item.kind === 'HEALTH'
      ? `${item.title} (${item.subtitle.toLowerCase()})`
      : item.title;
  return `${item.daysUntil < 0 ? '⚠️' : icon(item.type)} ${item.petName} · ${what}: ${when(item)}`;
}

/** Resumen diario de vacunas, desparasitaciones e higiene. */
export function upcomingDigest(items: UpcomingItem[]): AppNotification {
  const lines = items.slice(0, 4).map(upcomingLine);
  if (items.length > 4) lines.push(`y ${items.length - 4} más…`);
  const single = items.length === 1 ? items[0] : null;
  return {
    title: single
      ? `${icon(single.type)} ${single.petName}: ${single.title}`
      : `🐾 ${items.length} recordatorios de cuidado`,
    body: single ? upcomingLine(single).replace(/^\S+ /, '') : lines.join('\n'),
    url: single?.kind === 'GROOMING' ? '/higiene' : single ? '/vacunas' : '/',
    tag: 'recordatorios',
    ttl: 12 * 3600,
    urgency: 'high',
  };
}

interface TreatmentInfo {
  id: number;
  medicineName: string;
  dosage: string;
  pet: { name: string };
}

/** Recordatorio a la hora de una toma. */
export function doseMessage(
  t: TreatmentInfo & {
    doseNumber: number;
    totalDoses: number;
    at: Date;
    notes?: string | null;
  },
): AppNotification {
  const time = formatTime(t.at, appTimezone());
  return {
    title: `💊 Medicamento de ${t.pet.name}`,
    body: [
      `${t.medicineName} — ${t.dosage}`,
      `Toma ${t.doseNumber} de ${t.totalDoses} · ${time}`,
      t.notes,
      'Al dársela, márcala como dada en la app.',
    ]
      .filter(Boolean)
      .join('\n'),
    url: '/tratamientos',
    tag: `toma-${t.id}`,
    ttl: 30 * 60,
    urgency: 'high',
  };
}

/** Aviso a los demás cuando alguien marca una toma como dada. */
export function doseGivenMessage(
  t: TreatmentInfo & {
    doseNumber: number;
    totalDoses: number;
    givenAt: Date;
    givenBy: string;
  },
): AppNotification {
  return {
    title: `✅ ${t.pet.name} ya tomó su medicamento`,
    body: `${t.medicineName} — ${t.dosage} · toma ${t.doseNumber} de ${t.totalDoses}\nSe la dio ${t.givenBy} a las ${formatTime(t.givenAt, appTimezone())}.`,
    url: '/tratamientos',
    tag: `toma-${t.id}`,
    ttl: 6 * 3600,
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
    url: '/tratamientos',
    ttl: 24 * 3600,
  };
}

/** Aviso a los demás cuando alguien registra una vacuna o desparasitación reciente. */
export function healthGivenMessage(r: {
  petId: number;
  type: string;
  name: string;
  dateGiven: Date;
  pet: { name: string };
  givenBy: string;
}): AppNotification {
  const days = daysBetween(toDateOnly(r.dateGiven), todayIn(appTimezone()));
  const cuando = days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
  return {
    title: `${icon(r.type)} ${r.pet.name} recibió ${r.name}`,
    body: `${HEALTH_TYPE_LABEL[r.type] ?? 'Registro'} aplicada ${cuando}. La registró ${r.givenBy}.`,
    url: '/vacunas',
    tag: `salud-${r.petId}-${r.type}`,
    ttl: 12 * 3600,
  };
}
