import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HealthRecord } from '../generated/prisma/client.js';
import { appTimezone } from '../common/config.js';
import {
  daysBetween,
  parseDateOnly,
  todayIn,
  toDateOnly,
} from '../common/dates.js';
import type { AuthUser } from '../common/decorators.js';
import { healthGivenMessage } from '../notifications/messages.js';
import { NotifierService } from '../notifier/notifier.service.js';
import {
  computeDue,
  normalizeName,
  supersededIds,
} from '../common/due-status.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateHealthRecordDto,
  HealthRecordQueryDto,
  UpdateHealthRecordDto,
} from './health-records.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export const healthGroupKey = (r: HealthRecord) =>
  `${r.petId}|${r.type}|${normalizeName(r.name)}`;

@Injectable()
export class HealthRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
    private readonly notifier: NotifierService,
  ) {}

  async list(query: HealthRecordQueryDto) {
    const records = await this.prisma.healthRecord.findMany({
      where: { petId: query.petId, type: query.type },
      include,
      orderBy: [{ dateGiven: 'desc' }, { id: 'desc' }],
    });
    const superseded = supersededIds(
      records,
      healthGroupKey,
      (r) => r.dateGiven,
    );
    const today = todayIn(appTimezone());
    return records.map((r) => ({
      ...r,
      due: computeDue(r.nextDueDate, today, superseded.has(r.id), 7),
    }));
  }

  async create(dto: CreateHealthRecordDto, user: AuthUser) {
    await this.pets.ensureExists(dto.petId);
    const dateGiven = parseDateOnly(dto.dateGiven);
    const nextDueDate = dto.nextDueDate ? parseDateOnly(dto.nextDueDate) : null;
    this.checkDates(dateGiven, nextDueDate);
    const record = await this.prisma.healthRecord.create({
      data: {
        petId: dto.petId,
        type: dto.type,
        name: dto.name,
        dateGiven,
        nextDueDate,
        notes: dto.notes ?? null,
        createdById: user.id,
      },
      include,
    });

    // Si se aplicó hoy o ayer, avisa al resto para que nadie la repita.
    const daysAgo = daysBetween(
      toDateOnly(record.dateGiven),
      todayIn(appTimezone()),
    );
    if (daysAgo >= 0 && daysAgo <= 1) {
      await this.notifier.broadcast(
        healthGivenMessage({ ...record, givenBy: user.name }),
        {
          exceptUserId: user.id,
        },
      );
    }
    return record;
  }

  async update(id: number, dto: UpdateHealthRecordDto) {
    const current = await this.prisma.healthRecord.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Registro no encontrado');
    if (dto.petId) await this.pets.ensureExists(dto.petId);

    const dateGiven = dto.dateGiven
      ? parseDateOnly(dto.dateGiven)
      : current.dateGiven;
    const nextDueDate =
      dto.nextDueDate === undefined
        ? current.nextDueDate
        : dto.nextDueDate
          ? parseDateOnly(dto.nextDueDate)
          : null;
    this.checkDates(dateGiven, nextDueDate);

    return this.prisma.healthRecord.update({
      where: { id },
      data: {
        petId: dto.petId,
        type: dto.type,
        name: dto.name,
        dateGiven,
        nextDueDate,
        notes: dto.notes,
      },
      include,
    });
  }

  async remove(id: number) {
    const { count } = await this.prisma.healthRecord.deleteMany({
      where: { id },
    });
    if (!count) throw new NotFoundException('Registro no encontrado');
    return { ok: true };
  }

  private checkDates(given: Date, next: Date | null) {
    if (next && next < given) {
      throw new BadRequestException(
        'La próxima aplicación no puede ser anterior a la fecha de aplicación',
      );
    }
  }
}
