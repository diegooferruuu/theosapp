import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { appTimezone } from '../common/config.js';
import {
  formatDate,
  formatDateTime,
  toDateOnly,
  todayIn,
} from '../common/dates.js';
import {
  GROOMING_TYPE_LABEL,
  HEALTH_TYPE_LABEL,
  SEVERITY_LABEL,
  SYMPTOM_LABEL,
} from '../common/labels.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { totalDoses, treatmentEnd } from '../treatments/schedule.js';
import {
  COLORS,
  emptyNote,
  lineChart,
  MARGIN,
  pageWidth,
  sectionTitle,
  table,
} from './pdf-layout.js';

const TREATMENT_TYPE_LABEL: Record<string, string> = {
  PILL: 'Pastilla',
  CAPSULE: 'Cápsula',
  LIQUID: 'Jarabe',
  ORAL_DROPS: 'Gotas orales',
  EAR_DROPS: 'Gotas para oídos',
  EYE_DROPS: 'Ojos',
  OINTMENT: 'Pomada',
  INJECTION: 'Inyección',
  CLEANING: 'Limpieza',
  MEDICATED_BATH: 'Baño medicado',
  SUPPLEMENT: 'Suplemento',
  OTHER: 'Otro',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const day = (d: Date) => formatDate(toDateOnly(d)).replace(/^\S+,\s*/, ''); // "12 nov 2026"
const kg = (n: number | null) =>
  n === null
    ? '—'
    : `${n.toLocaleString('es', { maximumFractionDigits: 2 })} kg`;

function scheduleText(t: {
  scheduleType: string;
  times: string[];
  everyDays: number;
  frequencyHours: number | null;
  minIntervalHours: number | null;
}) {
  if (t.scheduleType === 'FIXED_TIMES') {
    return t.everyDays > 1
      ? `Cada ${t.everyDays} días (${t.times.join(', ')})`
      : `${t.times.join(', ')} diario`;
  }
  if (t.scheduleType === 'AS_NEEDED') {
    return t.minIntervalHours
      ? `Según necesidad (mín. ${t.minIntervalHours} h)`
      : 'Según necesidad';
  }
  return `Cada ${t.frequencyHours} h`;
}

function ageText(birth: Date | null): string | null {
  if (!birth) return null;
  const b = new Date(birth);
  const now = new Date();
  let months =
    (now.getUTCFullYear() - b.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    b.getUTCMonth();
  if (now.getUTCDate() < b.getUTCDate()) months--;
  if (months < 0) return null;
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Genera el historial médico en PDF. `months` = 0 → todo el historial. */
  async petReport(petId: number, months: number) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    const since = months
      ? new Date(Date.now() - months * 30.44 * 86_400_000)
      : null;
    const tz = appTimezone();

    const [
      health,
      treatments,
      visits,
      symptoms,
      weights,
      grooming,
      appointments,
    ] = await Promise.all([
      this.prisma.healthRecord.findMany({
        where: { petId, ...(since && { dateGiven: { gte: since } }) },
        include: { createdBy: { select: { name: true } } },
        orderBy: { dateGiven: 'desc' },
      }),
      this.prisma.medicationTreatment.findMany({
        where: { petId },
        include: { _count: { select: { doses: true } } },
        orderBy: { startAt: 'desc' },
      }),
      this.prisma.vetVisit.findMany({
        where: { petId, ...(since && { date: { gte: since } }) },
        orderBy: { date: 'desc' },
      }),
      this.prisma.symptomLog.findMany({
        where: { petId, ...(since && { occurredAt: { gte: since } }) },
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { photos: true } },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.weightRecord.findMany({
        where: { petId, ...(since && { date: { gte: since } }) },
        orderBy: { date: 'asc' },
      }),
      this.prisma.groomingLog.findMany({
        where: { petId, ...(since && { dateDone: { gte: since } }) },
        orderBy: { dateDone: 'desc' },
      }),
      this.prisma.vetAppointment.findMany({
        where: { petId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);
    // Tratamientos que tocan el período: activos, o que empezaron/terminaron dentro.
    const inPeriod = treatments.filter((t) => {
      if (!since || t.status === 'ACTIVE') return true;
      const end = treatmentEnd(t);
      return t.startAt >= since || (end !== null && end >= since);
    });

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: { Title: `Historial médico de ${pet.name}`, Author: 'Theo’s App' },
    });

    // ─── Encabezado ───
    const logo = join(process.cwd(), 'assets', 'logo.png');
    if (existsSync(logo)) doc.image(logo, MARGIN, MARGIN - 6, { height: 64 });
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(COLORS.text)
      .text(`Historial médico de ${pet.name}`, MARGIN + 66, MARGIN + 6);
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text(
        `Generado el ${day(new Date(`${todayIn(tz)}T00:00:00Z`))} · ${months ? `Período: últimos ${months} meses` : 'Historial completo'}`,
        MARGIN + 66,
      );
    doc.y = MARGIN + 70;

    // ─── Ficha ───
    const facts: [string, string][] = [
      ['Especie', pet.species ?? '—'],
      ['Raza', pet.breed ?? '—'],
      [
        'Nacimiento',
        pet.birthDate
          ? `${day(pet.birthDate)}${ageText(pet.birthDate) ? ` (${ageText(pet.birthDate)})` : ''}`
          : '—',
      ],
      ['Peso actual', kg(pet.currentWeightKg)],
    ];
    const boxTop = doc.y;
    const colW = pageWidth(doc) / 4;
    facts.forEach(([label, value], i) => {
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(label, MARGIN + i * colW, boxTop, { width: colW - 8 });
      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(COLORS.text)
        .text(value, MARGIN + i * colW, boxTop + 11, { width: colW - 8 });
    });
    doc.y = boxTop + 34;
    if (pet.notes) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.text)
        .text(`Notas: ${pet.notes}`, MARGIN, doc.y, { width: pageWidth(doc) });
    }

    // ─── Próximas citas ───
    if (appointments.length) {
      sectionTitle(doc, 'Próximas citas');
      table(
        doc,
        [
          { header: 'Fecha y hora', width: 1.5 },
          { header: 'Motivo', width: 2 },
          { header: 'Veterinario / lugar', width: 1.7 },
          { header: 'Indicaciones', width: 2.2 },
        ],
        appointments.map((a) => [
          formatDateTime(a.scheduledAt, tz),
          a.reason,
          [a.vetName, a.location].filter(Boolean).join('\n'),
          a.notes ?? '',
        ]),
      );
    }

    // ─── Vacunas y desparasitaciones ───
    sectionTitle(doc, 'Vacunas y desparasitaciones');
    if (!health.length) emptyNote(doc);
    else
      table(
        doc,
        [
          { header: 'Aplicada', width: 1.3 },
          { header: 'Tipo', width: 1.6 },
          { header: 'Producto', width: 1.8 },
          { header: 'Próxima', width: 1.3 },
          { header: 'Registró', width: 1 },
          { header: 'Notas', width: 2 },
        ],
        health.map((h) => [
          day(h.dateGiven),
          HEALTH_TYPE_LABEL[h.type],
          h.name,
          h.nextDueDate ? day(h.nextDueDate) : '—',
          h.createdBy?.name ?? '—',
          h.notes ?? '',
        ]),
      );

    // ─── Tratamientos ───
    sectionTitle(doc, 'Tratamientos y medicamentos');
    if (!inPeriod.length) emptyNote(doc);
    else
      table(
        doc,
        [
          { header: 'Medicamento / producto', width: 1.9 },
          { header: 'Dosis', width: 2 },
          { header: 'Horario', width: 1.6 },
          { header: 'Período', width: 1.7 },
          { header: 'Estado', width: 1 },
          { header: 'Tomas', width: 0.9, align: 'right' },
        ],
        inPeriod.map((t) => {
          const end = treatmentEnd(t);
          const total = totalDoses(t);
          return [
            `${t.medicineName}\n${TREATMENT_TYPE_LABEL[t.type]}`,
            [t.dosage, t.instructions].filter(Boolean).join('\n'),
            scheduleText(t),
            end
              ? `${day(t.startAt)} – ${day(new Date(end.getTime() - 1))}`
              : `Desde ${day(t.startAt)}`,
            STATUS_LABEL[t.status],
            total ? `${t._count.doses}/${total}` : String(t._count.doses),
          ];
        }),
      );

    // ─── Visitas ───
    sectionTitle(doc, 'Visitas al veterinario');
    if (!visits.length) emptyNote(doc);
    else
      table(
        doc,
        [
          { header: 'Fecha', width: 1.2 },
          { header: 'Motivo', width: 2 },
          { header: 'Diagnóstico', width: 2.8 },
          { header: 'Veterinario', width: 1.4 },
          { header: 'Peso', width: 0.9, align: 'right' },
        ],
        visits.map((v) => [
          day(v.date),
          v.reason,
          [v.diagnosis, v.notes].filter(Boolean).join('\n'),
          v.vetName ?? '',
          kg(v.weightKg),
        ]),
      );

    // ─── Síntomas ───
    sectionTitle(doc, 'Diario de síntomas');
    if (!symptoms.length) emptyNote(doc);
    else
      table(
        doc,
        [
          { header: 'Fecha y hora', width: 1.5 },
          { header: 'Síntoma', width: 1.3 },
          { header: 'Intensidad', width: 0.9 },
          { header: 'Detalle', width: 3.6 },
          { header: 'Anotó', width: 0.9 },
        ],
        symptoms.map((s) => [
          formatDateTime(s.occurredAt, tz),
          SYMPTOM_LABEL[s.category],
          SEVERITY_LABEL[s.severity],
          [
            s.description,
            s._count.photos
              ? `(${s._count.photos} ${s._count.photos === 1 ? 'foto' : 'fotos'} en la app)`
              : null,
          ]
            .filter(Boolean)
            .join(' '),
          s.createdBy?.name ?? '',
        ]),
      );

    // ─── Peso ───
    sectionTitle(doc, 'Evolución del peso', weights.length ? 170 : 20);
    if (!weights.length) emptyNote(doc);
    else {
      lineChart(
        doc,
        weights.map((w) => ({ label: day(w.date), value: w.weightKg })),
        'kg',
      );
      table(
        doc,
        [
          { header: 'Fecha', width: 1 },
          { header: 'Peso', width: 1, align: 'right' },
          { header: 'Notas', width: 3 },
        ],
        [...weights]
          .reverse()
          .slice(0, 12)
          .map((w) => [day(w.date), kg(w.weightKg), w.notes ?? '']),
      );
    }

    // ─── Higiene ───
    sectionTitle(doc, 'Higiene y estética');
    if (!grooming.length) emptyNote(doc);
    else
      table(
        doc,
        [
          { header: 'Fecha', width: 1 },
          { header: 'Servicio', width: 1.5 },
          { header: 'Próximo turno', width: 1.2 },
          { header: 'Notas', width: 2.5 },
        ],
        grooming.map((g) => [
          day(g.dateDone),
          GROOMING_TYPE_LABEL[g.serviceType],
          g.nextDueDate ? day(g.nextDueDate) : '—',
          g.notes ?? '',
        ]),
      );

    // ─── Pie de página ───
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Sin margen inferior mientras se escribe el pie, para que no agregue páginas.
      doc.page.margins.bottom = 0;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(
          `Theo’s App · ${pet.name} · página ${i + 1} de ${range.count}`,
          MARGIN,
          doc.page.height - MARGIN + 10,
          {
            width: pageWidth(doc),
            align: 'center',
            lineBreak: false,
          },
        );
    }

    const filename = `historial-${pet.name.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${todayIn(tz)}.pdf`;
    return { doc, filename };
  }
}
