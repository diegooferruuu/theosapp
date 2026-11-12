import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MedicationTreatment } from '../generated/prisma/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { appTimezone } from '../common/config.js';
import {
  formatDateTime,
  formatTime,
  todayIn,
  zonedDateTime,
} from '../common/dates.js';
import type { AuthUser } from '../common/decorators.js';
import {
  doseGivenMessage,
  stockLowMessage,
} from '../notifications/messages.js';
import { NotifierService } from '../notifier/notifier.service.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  describeDose,
  formatAmount,
  perDose,
  stockUnit,
  unitLabel,
} from './dose-text.js';
import { GiveDoseDto } from './doses.dto.js';
import {
  asNeededStatus,
  currentDose,
  doseAt,
  EARLY_GIVE_MINUTES,
  isScheduled,
  scheduleWindow,
  totalDoses,
  treatmentEnd,
  treatmentProgress,
} from './schedule.js';
import {
  CreateTreatmentDto,
  TreatmentQueryDto,
  UpdateTreatmentDto,
} from './treatments.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

const doseSelect = {
  doseNumber: true,
  givenAt: true,
  notes: true,
  givenBy: { select: { id: true, name: true } },
} as const;

type GivenDose = Prisma.MedicationDoseGetPayload<{ select: typeof doseSelect }>;

const NO_AMOUNT = ['OINTMENT', 'CLEANING', 'MEDICATED_BATH', 'OTHER'];

/** Información de stock lista para mostrar. */
function stockInfo(t: MedicationTreatment) {
  if (t.stockQuantity === null) return null;
  const per = perDose(t);
  const unit = stockUnit(t);
  const alertAt = t.stockAlertAt ?? per * 3;
  const dosesLeft = Math.floor(t.stockQuantity / per + 1e-9);
  let dosesPerDay: number | null = null;
  if (t.scheduleType === 'FIXED_TIMES' && t.times.length)
    dosesPerDay = t.times.length / t.everyDays;
  if (t.scheduleType === 'INTERVAL' && t.frequencyHours)
    dosesPerDay = 24 / t.frequencyHours;
  const quantity = Math.max(0, t.stockQuantity);
  return {
    quantity,
    unit,
    label: `${formatAmount(quantity, unit !== 'ml')} ${unitLabel(unit, quantity > 0 && quantity <= 1 ? 1 : 2)}`,
    perDose: per,
    alertAt,
    low: quantity <= alertAt,
    dosesLeft,
    daysLeft: dosesPerDay ? Math.floor(dosesLeft / dosesPerDay) : null,
  };
}

@Injectable()
export class TreatmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
    private readonly notifier: NotifierService,
  ) {}

  /** Marca como finalizados los tratamientos activos cuyo plazo ya terminó. */
  async finishExpired(now = new Date()): Promise<MedicationTreatment[]> {
    const active = await this.prisma.medicationTreatment.findMany({
      where: { status: 'ACTIVE', durationDays: { not: null } },
    });
    const expired = active.filter((t) => {
      const end = treatmentEnd(t);
      return end !== null && end <= now;
    });
    if (expired.length) {
      await this.prisma.medicationTreatment.updateMany({
        where: { id: { in: expired.map((t) => t.id) }, status: 'ACTIVE' },
        data: { status: 'FINISHED' },
      });
    }
    return expired;
  }

  /** Progreso, toma actual (o estado "según necesidad") y stock. */
  private enrich<T extends MedicationTreatment>(
    t: T,
    given: GivenDose[],
    now = new Date(),
  ) {
    const byNumber = new Map(given.map((g) => [g.doseNumber, g]));
    const last = given.reduce<GivenDose | null>(
      (acc, g) => (!acc || g.givenAt > acc.givenAt ? g : acc),
      null,
    );
    const current = currentDose(t, now);
    return {
      ...t,
      progress: treatmentProgress(t, now),
      givenCount: given.length,
      lastGiven: last,
      current: current
        ? {
            ...current,
            given: byNumber.get(current.number) ?? null,
            nextAt: doseAt(t, current.number + 1),
          }
        : null,
      asNeeded: isScheduled(t)
        ? null
        : asNeededStatus(
            t,
            given.map((g) => g.givenAt),
            now,
          ),
      stock: stockInfo(t),
    };
  }

  async list(query: TreatmentQueryDto) {
    const treatments = await this.prisma.medicationTreatment.findMany({
      where: { petId: query.petId, status: query.status },
      include: { ...include, doses: { select: doseSelect } },
      orderBy: [{ status: 'asc' }, { startAt: 'desc' }],
    });
    const now = new Date();
    return treatments.map(({ doses, ...t }) => this.enrich(t, doses, now));
  }

  async schedule(id: number) {
    const t = await this.prisma.medicationTreatment.findUnique({
      where: { id },
      include: {
        ...include,
        doses: { select: doseSelect, orderBy: { givenAt: 'desc' } },
      },
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    const { doses: given, ...treatment } = t;
    const now = new Date();
    if (!isScheduled(treatment)) {
      return {
        ...this.enrich(treatment, given, now),
        partial: false,
        doses: given.map((g) => ({
          number: g.doseNumber,
          at: g.givenAt,
          past: true,
          given: g,
        })),
      };
    }
    const byNumber = new Map(given.map((g) => [g.doseNumber, g]));
    const window = scheduleWindow(treatment, now);
    return {
      ...this.enrich(treatment, given, now),
      partial: window.partial,
      doses: window.doses.map((d) => ({
        ...d,
        past: d.at <= now,
        given: byNumber.get(d.number) ?? null,
      })),
    };
  }

  /** Registra que se dio una toma. Si alguien ya la dio, lo dice y no la duplica. */
  async giveDose(id: number, dto: GiveDoseDto, user: AuthUser) {
    const t = await this.prisma.medicationTreatment.findUnique({
      where: { id },
      include: {
        pet: { select: { name: true } },
        doses: {
          select: {
            doseNumber: true,
            givenAt: true,
            givenBy: { select: { name: true } },
          },
        },
      },
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    if (t.status !== 'ACTIVE')
      throw new BadRequestException('El tratamiento no está activo');

    const tz = appTimezone();
    const now = new Date();
    let doseNumber: number;
    let scheduledAt: Date;

    if (isScheduled(t)) {
      if (!dto.doseNumber)
        throw new BadRequestException('Indica qué toma se dio');
      const at = doseAt(t, dto.doseNumber, tz);
      if (!at)
        throw new BadRequestException('Esa toma no existe en el tratamiento');
      if (at.getTime() - now.getTime() > EARLY_GIVE_MINUTES * 60_000) {
        throw new BadRequestException(
          `La toma ${dto.doseNumber} es el ${formatDateTime(at, tz)}; todavía falta.`,
        );
      }
      doseNumber = dto.doseNumber;
      scheduledAt = at;
    } else {
      const status = asNeededStatus(
        t,
        t.doses.map((d) => d.givenAt),
        now,
      );
      if (!status.canGive && status.nextAllowedAt) {
        const last = t.doses.reduce((a, d) => (d.givenAt > a.givenAt ? d : a));
        const reason =
          status.reason === 'max'
            ? `Ya se dieron ${status.last24h} dosis en las últimas 24 h (máximo ${t.maxPerDay}).`
            : `La última dosis se la dio ${last.givenBy?.name ?? 'alguien'} a las ${formatTime(last.givenAt, tz)}.`;
        throw new ConflictException(
          `¡Espera! ${reason} La próxima se puede dar el ${formatDateTime(status.nextAllowedAt, tz)}.`,
        );
      }
      doseNumber =
        t.doses.reduce((max, d) => Math.max(max, d.doseNumber), 0) + 1;
      scheduledAt = now;
    }

    const per = perDose(t);
    let dose: GivenDose;
    let newStock: number | null = null;
    try {
      [dose, newStock] = await this.prisma.$transaction(async (tx) => {
        const created = await tx.medicationDose.create({
          data: {
            treatmentId: id,
            doseNumber,
            scheduledAt,
            givenById: user.id,
            notes: dto.notes ?? null,
          },
          select: doseSelect,
        });
        let stock: number | null = null;
        if (t.stockQuantity !== null) {
          stock = Math.max(0, t.stockQuantity - per);
          await tx.medicationTreatment.update({
            where: { id },
            data: { stockQuantity: stock },
          });
        }
        return [created, stock] as const;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.medicationDose.findUnique({
          where: { treatmentId_doseNumber: { treatmentId: id, doseNumber } },
          select: doseSelect,
        });
        throw new ConflictException(
          `¡Ojo! Esa toma ya la registró ${existing?.givenBy?.name ?? 'alguien'} a las ${existing ? formatTime(existing.givenAt, tz) : '?'}.`,
        );
      }
      throw e;
    }

    await this.notifier.broadcast(
      doseGivenMessage({
        ...t,
        doseNumber,
        totalDoses: totalDoses(t),
        givenAt: dose.givenAt,
        givenBy: user.name,
        asNeeded: !isScheduled(t),
      }),
      { exceptUserId: user.id },
    );

    // Aviso de stock bajo cuando cruza el umbral (una vez por reposición).
    if (newStock !== null && t.stockQuantity !== null) {
      const alertAt = t.stockAlertAt ?? per * 3;
      if (t.stockQuantity > alertAt && newStock <= alertAt) {
        const info = stockInfo({ ...t, stockQuantity: newStock });
        if (info) {
          await this.notifier.broadcast(
            stockLowMessage({
              ...t,
              remaining: info.label,
              daysLeft: info.daysLeft,
            }),
          );
        }
      }
    }
    return dose;
  }

  /** Deshace una toma marcada por error (quien la marcó o un superadmin). */
  async undoDose(id: number, doseNumber: number, user: AuthUser) {
    const dose = await this.prisma.medicationDose.findUnique({
      where: { treatmentId_doseNumber: { treatmentId: id, doseNumber } },
      include: { treatment: true },
    });
    if (!dose) throw new NotFoundException('Esa toma no estaba marcada');
    if (dose.givenById !== user.id && user.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Solo quien marcó la toma (o un superadmin) puede deshacerla',
      );
    }
    const t = dose.treatment;
    await this.prisma.$transaction(async (tx) => {
      await tx.medicationDose.delete({ where: { id: dose.id } });
      if (t.stockQuantity !== null) {
        await tx.medicationTreatment.update({
          where: { id },
          data: { stockQuantity: t.stockQuantity + perDose(t) },
        });
      }
    });
    return { ok: true };
  }

  /**
   * Combina lo guardado con lo recibido, valida según el tipo de horario y
   * calcula el texto de la dosis.
   */
  private buildData(
    dto: CreateTreatmentDto | UpdateTreatmentDto,
    current?: MedicationTreatment,
  ) {
    const merged = {
      type: dto.type ?? current?.type ?? 'OTHER',
      scheduleType: dto.scheduleType ?? current?.scheduleType ?? 'INTERVAL',
      amount: dto.amount !== undefined ? dto.amount : (current?.amount ?? null),
      unit: dto.unit !== undefined ? dto.unit : (current?.unit ?? null),
      strength:
        dto.strength !== undefined ? dto.strength : (current?.strength ?? null),
      site: dto.site !== undefined ? dto.site : (current?.site ?? null),
      foodTiming:
        dto.foodTiming !== undefined
          ? dto.foodTiming
          : (current?.foodTiming ?? null),
      dosage: dto.dosage ?? current?.dosage ?? '',
      frequencyHours:
        dto.frequencyHours !== undefined
          ? dto.frequencyHours
          : (current?.frequencyHours ?? null),
      times: dto.times ?? current?.times ?? [],
      everyDays: dto.everyDays ?? current?.everyDays ?? 1,
      startAt: dto.startAt ? new Date(dto.startAt) : current?.startAt,
    };
    if (!merged.startAt)
      throw new BadRequestException('Falta la fecha de inicio');
    if (NO_AMOUNT.includes(merged.type)) merged.amount = null;

    const times = [...new Set(merged.times)].sort();
    if (merged.scheduleType === 'INTERVAL' && !merged.frequencyHours) {
      throw new BadRequestException('Indica cada cuántas horas');
    }
    if (merged.scheduleType === 'FIXED_TIMES') {
      if (!times.length)
        throw new BadRequestException('Agrega al menos una hora');
      // Los horarios fijos cuentan desde la medianoche (hora local) del primer día.
      const tz = appTimezone();
      merged.startAt = zonedDateTime(todayIn(tz, merged.startAt), '00:00', tz);
    }
    if (merged.type === 'OTHER' && !merged.dosage.trim()) {
      throw new BadRequestException('Indica la dosis');
    }

    return {
      type: merged.type,
      scheduleType: merged.scheduleType,
      amount: merged.amount,
      unit: merged.unit,
      strength: merged.strength,
      site: merged.site,
      foodTiming: merged.foodTiming,
      dosage: describeDose(merged),
      frequencyHours:
        merged.scheduleType === 'INTERVAL' ? merged.frequencyHours : null,
      times: merged.scheduleType === 'FIXED_TIMES' ? times : [],
      everyDays: merged.scheduleType === 'FIXED_TIMES' ? merged.everyDays : 1,
      startAt: merged.startAt,
      instructions: dto.instructions,
      durationDays: dto.durationDays,
      minIntervalHours: dto.minIntervalHours,
      maxPerDay: dto.maxPerDay,
      stockQuantity: dto.stockQuantity,
      stockAlertAt: dto.stockAlertAt,
      notifyDoses: dto.notifyDoses,
      notes: dto.notes,
    };
  }

  async create(dto: CreateTreatmentDto, userId: number) {
    await this.pets.ensureExists(dto.petId);
    const t = await this.prisma.medicationTreatment.create({
      data: {
        ...this.buildData(dto),
        petId: dto.petId,
        medicineName: dto.medicineName,
        durationDays: dto.durationDays ?? null,
        notifyDoses: dto.notifyDoses ?? true,
        createdById: userId,
      },
      include,
    });
    return this.enrich(t, []);
  }

  async update(id: number, dto: UpdateTreatmentDto) {
    const current = await this.prisma.medicationTreatment.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Tratamiento no encontrado');
    if (dto.petId) await this.pets.ensureExists(dto.petId);
    const t = await this.prisma.medicationTreatment.update({
      where: { id },
      data: {
        ...this.buildData(dto, current),
        petId: dto.petId,
        medicineName: dto.medicineName,
        status: dto.status,
      },
      include: { ...include, doses: { select: doseSelect } },
    });
    const { doses, ...treatment } = t;
    return this.enrich(treatment, doses);
  }

  async remove(id: number) {
    const { count } = await this.prisma.medicationTreatment.deleteMany({
      where: { id },
    });
    if (!count) throw new NotFoundException('Tratamiento no encontrado');
    return { ok: true };
  }
}
