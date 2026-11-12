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
import { formatDateTime, formatTime } from '../common/dates.js';
import type { AuthUser } from '../common/decorators.js';
import { doseGivenMessage } from '../notifications/messages.js';
import { NotifierService } from '../notifier/notifier.service.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GiveDoseDto } from './doses.dto.js';
import {
  currentDose,
  doseTimes,
  EARLY_GIVE_MINUTES,
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
      where: { status: 'ACTIVE' },
    });
    const expired = active.filter((t) => treatmentEnd(t) <= now);
    if (expired.length) {
      await this.prisma.medicationTreatment.updateMany({
        where: { id: { in: expired.map((t) => t.id) }, status: 'ACTIVE' },
        data: { status: 'FINISHED' },
      });
    }
    return expired;
  }

  /** Progreso + toma actual con quién la dio (si ya se dio). */
  private enrich<T extends MedicationTreatment>(
    t: T,
    given: GivenDose[],
    now = new Date(),
  ) {
    const byNumber = new Map(given.map((g) => [g.doseNumber, g]));
    const current = currentDose(t, now);
    const last = given.reduce<GivenDose | null>(
      (acc, g) => (!acc || g.doseNumber > acc.doseNumber ? g : acc),
      null,
    );
    return {
      ...t,
      progress: treatmentProgress(t, now),
      givenCount: given.length,
      lastGiven: last,
      current: { ...current, given: byNumber.get(current.number) ?? null },
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
      include: { ...include, doses: { select: doseSelect } },
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    const { doses: given, ...treatment } = t;
    const byNumber = new Map(given.map((g) => [g.doseNumber, g]));
    const now = new Date();
    return {
      ...this.enrich(treatment, given, now),
      doses: doseTimes(treatment).map((at, i) => ({
        number: i + 1,
        at,
        past: at <= now,
        given: byNumber.get(i + 1) ?? null,
      })),
    };
  }

  /** Registra que se dio una toma. Si alguien ya la dio, lo dice y no la duplica. */
  async giveDose(id: number, dto: GiveDoseDto, user: AuthUser) {
    const t = await this.prisma.medicationTreatment.findUnique({
      where: { id },
      include: { pet: { select: { name: true } } },
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    if (t.status !== 'ACTIVE') {
      throw new BadRequestException('El tratamiento no está activo');
    }
    const doses = doseTimes(t);
    const scheduledAt = doses[dto.doseNumber - 1];
    if (!scheduledAt)
      throw new BadRequestException('Esa toma no existe en el tratamiento');
    if (scheduledAt.getTime() - Date.now() > EARLY_GIVE_MINUTES * 60_000) {
      throw new BadRequestException(
        `La toma ${dto.doseNumber} es el ${formatDateTime(scheduledAt, appTimezone())}; todavía falta.`,
      );
    }

    let dose: GivenDose;
    try {
      dose = await this.prisma.medicationDose.create({
        data: {
          treatmentId: id,
          doseNumber: dto.doseNumber,
          scheduledAt,
          givenById: user.id,
          notes: dto.notes ?? null,
        },
        select: doseSelect,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.medicationDose.findUnique({
          where: {
            treatmentId_doseNumber: {
              treatmentId: id,
              doseNumber: dto.doseNumber,
            },
          },
          select: doseSelect,
        });
        throw new ConflictException(
          `¡Ojo! La toma ${dto.doseNumber} ya se la dio ${existing?.givenBy?.name ?? 'alguien'} a las ${existing ? formatTime(existing.givenAt, appTimezone()) : '?'}.`,
        );
      }
      throw e;
    }

    await this.notifier.broadcast(
      doseGivenMessage({
        ...t,
        doseNumber: dto.doseNumber,
        totalDoses: doses.length,
        givenAt: dose.givenAt,
        givenBy: user.name,
      }),
      { exceptUserId: user.id },
    );
    return dose;
  }

  /** Deshace una toma marcada por error (quien la marcó o un superadmin). */
  async undoDose(id: number, doseNumber: number, user: AuthUser) {
    const dose = await this.prisma.medicationDose.findUnique({
      where: { treatmentId_doseNumber: { treatmentId: id, doseNumber } },
    });
    if (!dose) throw new NotFoundException('Esa toma no estaba marcada');
    if (dose.givenById !== user.id && user.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Solo quien marcó la toma (o un superadmin) puede deshacerla',
      );
    }
    await this.prisma.medicationDose.delete({ where: { id: dose.id } });
    return { ok: true };
  }

  async create(dto: CreateTreatmentDto, userId: number) {
    await this.pets.ensureExists(dto.petId);
    const t = await this.prisma.medicationTreatment.create({
      data: {
        petId: dto.petId,
        medicineName: dto.medicineName,
        dosage: dto.dosage,
        startAt: new Date(dto.startAt),
        durationDays: dto.durationDays,
        frequencyHours: dto.frequencyHours,
        notifyDoses: dto.notifyDoses ?? true,
        notes: dto.notes ?? null,
        createdById: userId,
      },
      include,
    });
    return this.enrich(t, []);
  }

  async update(id: number, dto: UpdateTreatmentDto) {
    const exists = await this.prisma.medicationTreatment.count({
      where: { id },
    });
    if (!exists) throw new NotFoundException('Tratamiento no encontrado');
    if (dto.petId) await this.pets.ensureExists(dto.petId);
    const t = await this.prisma.medicationTreatment.update({
      where: { id },
      data: {
        petId: dto.petId,
        medicineName: dto.medicineName,
        dosage: dto.dosage,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        durationDays: dto.durationDays,
        frequencyHours: dto.frequencyHours,
        status: dto.status,
        notifyDoses: dto.notifyDoses,
        notes: dto.notes,
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
