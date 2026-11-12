import { appTimezone } from '../common/config.js';
import {
  daysBetween,
  formatDateTime,
  formatTime,
  relativeDays,
  todayIn,
  toDateOnly,
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
  type?: string;
  medicineName: string;
  dosage: string;
  instructions?: string | null;
  pet: { name: string };
}

/** Textos según el tipo: los medicamentos "se toman"; las limpiezas "se hacen". */
const COPY: Record<
  string,
  {
    icon: string;
    reminder: (pet: string) => string;
    done: (pet: string) => string;
  }
> = {
  MEDICINE: {
    icon: '💊',
    reminder: (pet) => `Medicamento de ${pet}`,
    done: (pet) => `${pet} ya tomó su medicamento`,
  },
  SUPPLEMENT: {
    icon: '🦴',
    reminder: (pet) => `Suplemento de ${pet}`,
    done: (pet) => `${pet} ya tomó su suplemento`,
  },
  EAR_DROPS: {
    icon: '👂',
    reminder: (pet) => `Gotas para los oídos de ${pet}`,
    done: (pet) => `${pet} ya tiene sus gotas`,
  },
  EYE_DROPS: {
    icon: '👁️',
    reminder: (pet) => `Gotas para los ojos de ${pet}`,
    done: (pet) => `${pet} ya tiene sus gotas`,
  },
  OINTMENT: {
    icon: '🧴',
    reminder: (pet) => `Pomada para ${pet}`,
    done: (pet) => `${pet} ya tiene su pomada`,
  },
  CLEANING: {
    icon: '🧽',
    reminder: (pet) => `Limpieza de ${pet}`,
    done: (pet) => `Limpieza de ${pet} hecha`,
  },
  MEDICATED_BATH: {
    icon: '🛁',
    reminder: (pet) => `Baño medicado de ${pet}`,
    done: (pet) => `Baño medicado de ${pet} hecho`,
  },
};
const copyFor = (type?: string) => COPY[type ?? ''] ?? COPY.MEDICINE;
const isMedicine = (type?: string) =>
  !type ||
  ![
    'EAR_DROPS',
    'EYE_DROPS',
    'OINTMENT',
    'CLEANING',
    'MEDICATED_BATH',
  ].includes(type);

const doseLabel = (n: number, total: number | null) =>
  total ? `Toma ${n} de ${total}` : `Toma ${n}`;

/** Recordatorio a la hora de una toma. */
export function doseMessage(
  t: TreatmentInfo & {
    doseNumber: number;
    totalDoses: number | null;
    at: Date;
    notes?: string | null;
  },
): AppNotification {
  const c = copyFor(t.type);
  return {
    title: `${c.icon} ${c.reminder(t.pet.name)}`,
    body: [
      `${t.medicineName} — ${t.dosage}`,
      t.instructions,
      `${doseLabel(t.doseNumber, t.totalDoses)} · ${formatTime(t.at, appTimezone())}`,
      'Al hacerlo, márcalo como dado en la app.',
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
    totalDoses: number | null;
    givenAt: Date;
    givenBy: string;
    asNeeded?: boolean;
  },
): AppNotification {
  const c = copyFor(t.type);
  const who = isMedicine(t.type)
    ? `Se la dio ${t.givenBy}`
    : `Lo hizo ${t.givenBy}`;
  const which = t.asNeeded
    ? 'dosis según necesidad'
    : doseLabel(t.doseNumber, t.totalDoses).toLowerCase();
  return {
    title: `✅ ${c.done(t.pet.name)}`,
    body: `${t.medicineName} — ${t.dosage} · ${which}\n${who} a las ${formatTime(t.givenAt, appTimezone())}.`,
    url: '/tratamientos',
    tag: `toma-${t.id}`,
    ttl: 6 * 3600,
    urgency: 'high',
  };
}

/** Nadie marcó la toma un rato después de su hora. */
export function pendingDoseMessage(
  t: TreatmentInfo & {
    doseNumber: number;
    totalDoses: number | null;
    at: Date;
  },
): AppNotification {
  const time = formatTime(t.at, appTimezone());
  return {
    title: `⚠️ ¿Ya le dieron su medicamento a ${t.pet.name}?`,
    body: `Nadie marcó la ${doseLabel(t.doseNumber, t.totalDoses).toLowerCase()} de las ${time}: ${t.medicineName} — ${t.dosage}.\nSi ya se la dieron, márquenla en la app.`,
    url: '/tratamientos',
    tag: `toma-${t.id}`,
    ttl: 2 * 3600,
    urgency: 'high',
  };
}

/** Aviso a todos cuando queda poco stock. */
export function stockLowMessage(t: {
  id: number;
  medicineName: string;
  pet: { name: string };
  remaining: string;
  daysLeft: number | null;
}): AppNotification {
  const days =
    t.daysLeft !== null
      ? ` (≈ ${t.daysLeft} ${t.daysLeft === 1 ? 'día' : 'días'})`
      : '';
  return {
    title: `📦 Queda poco ${t.medicineName}`,
    body: `Quedan ${t.remaining}${days} para ${t.pet.name}. Hay que comprar más.`,
    url: '/tratamientos',
    tag: `stock-${t.id}`,
    ttl: 24 * 3600,
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

interface AppointmentInfo {
  id: number;
  scheduledAt: Date;
  reason: string;
  vetName?: string | null;
  location?: string | null;
  notes?: string | null;
  pet: { name: string };
}

function appointmentLine(a: AppointmentInfo, tz: string) {
  return [a.reason, formatTime(a.scheduledAt, tz), a.vetName, a.location]
    .filter(Boolean)
    .join(' · ');
}

/** Aviso a los demás al agendar una cita. */
export function appointmentCreatedMessage(
  a: AppointmentInfo & { createdBy: string },
): AppNotification {
  const tz = appTimezone();
  return {
    title: `📅 Cita para ${a.pet.name}: ${formatDateTime(a.scheduledAt, tz)}`,
    body: `${[a.reason, a.vetName, a.location].filter(Boolean).join(' · ')}\nLa agendó ${a.createdBy}.`,
    url: `/visitas?cita=${a.id}`,
    tag: `cita-${a.id}`,
    ttl: 24 * 3600,
  };
}

/** Recordatorios de una cita: el día anterior, 2 h antes y después (registrar resultado). */
export function appointmentReminderMessage(
  a: AppointmentInfo,
  bucket: 'day' | 'soon' | 'after',
  symptomCount = 0,
): AppNotification {
  const tz = appTimezone();
  const prep = a.notes ? `Recuerda: ${a.notes}` : null;
  if (bucket === 'after') {
    return {
      title: `🩺 ¿Cómo fue la cita de ${a.pet.name}?`,
      body: `${a.reason}. Registra el diagnóstico, el peso y si le recetaron algo.`,
      url: `/visitas?cita=${a.id}`,
      tag: `cita-${a.id}`,
      ttl: 24 * 3600,
    };
  }
  const symptoms =
    symptomCount > 0
      ? `Hay ${symptomCount} ${symptomCount === 1 ? 'síntoma anotado' : 'síntomas anotados'} desde la última visita; lleva el historial en PDF.`
      : null;
  if (bucket === 'soon') {
    return {
      title: `⏰ En menos de 2 horas: cita de ${a.pet.name}`,
      body: [appointmentLine(a, tz), prep, symptoms].filter(Boolean).join('\n'),
      url: `/visitas?cita=${a.id}`,
      tag: `cita-${a.id}`,
      ttl: 2 * 3600,
      urgency: 'high',
    };
  }
  const tomorrow = daysBetween(todayIn(tz), todayIn(tz, a.scheduledAt)) === 1;
  return {
    title: tomorrow
      ? `📅 Mañana: cita de ${a.pet.name} con el veterinario`
      : `📅 Cita de ${a.pet.name}: ${formatDateTime(a.scheduledAt, tz)}`,
    body: [appointmentLine(a, tz), prep, symptoms].filter(Boolean).join('\n'),
    url: `/visitas?cita=${a.id}`,
    tag: `cita-${a.id}`,
    ttl: 12 * 3600,
  };
}
