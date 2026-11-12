import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GroomingLog } from '../generated/prisma/client.js';
import { appTimezone } from '../common/config.js';
import { parseDateOnly, todayIn } from '../common/dates.js';
import { computeDue, supersededIds } from '../common/due-status.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateGroomingDto,
  GroomingQueryDto,
  UpdateGroomingDto,
} from './grooming.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

export const groomingGroupKey = (g: GroomingLog) =>
  `${g.petId}|${g.serviceType}`;

@Injectable()
export class GroomingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
  ) {}

  async list(query: GroomingQueryDto) {
    const logs = await this.prisma.groomingLog.findMany({
      where: { petId: query.petId, serviceType: query.serviceType },
      include,
      orderBy: [{ dateDone: 'desc' }, { id: 'desc' }],
    });
    const superseded = supersededIds(logs, groomingGroupKey, (g) => g.dateDone);
    const today = todayIn(appTimezone());
    return logs.map((g) => ({
      ...g,
      due: computeDue(g.nextDueDate, today, superseded.has(g.id), 3),
    }));
  }

  async create(dto: CreateGroomingDto, userId: number) {
    await this.pets.ensureExists(dto.petId);
    const dateDone = parseDateOnly(dto.dateDone);
    const nextDueDate = dto.nextDueDate ? parseDateOnly(dto.nextDueDate) : null;
    this.checkDates(dateDone, nextDueDate);
    return this.prisma.groomingLog.create({
      data: {
        petId: dto.petId,
        serviceType: dto.serviceType,
        dateDone,
        nextDueDate,
        notes: dto.notes ?? null,
        createdById: userId,
      },
      include,
    });
  }

  async update(id: number, dto: UpdateGroomingDto) {
    const current = await this.prisma.groomingLog.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Registro no encontrado');
    if (dto.petId) await this.pets.ensureExists(dto.petId);

    const dateDone = dto.dateDone
      ? parseDateOnly(dto.dateDone)
      : current.dateDone;
    const nextDueDate =
      dto.nextDueDate === undefined
        ? current.nextDueDate
        : dto.nextDueDate
          ? parseDateOnly(dto.nextDueDate)
          : null;
    this.checkDates(dateDone, nextDueDate);

    return this.prisma.groomingLog.update({
      where: { id },
      data: {
        petId: dto.petId,
        serviceType: dto.serviceType,
        dateDone,
        nextDueDate,
        notes: dto.notes,
      },
      include,
    });
  }

  async remove(id: number) {
    const { count } = await this.prisma.groomingLog.deleteMany({
      where: { id },
    });
    if (!count) throw new NotFoundException('Registro no encontrado');
    return { ok: true };
  }

  private checkDates(done: Date, next: Date | null) {
    if (next && next < done) {
      throw new BadRequestException(
        'El próximo turno no puede ser anterior a la fecha de realización',
      );
    }
  }
}
