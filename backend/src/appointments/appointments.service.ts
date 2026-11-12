import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { VetAppointment } from '../generated/prisma/client.js';
import type { AuthUser } from '../common/decorators.js';
import { appointmentCreatedMessage } from '../notifications/messages.js';
import { NotifierService } from '../notifier/notifier.service.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AppointmentQueryDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './appointments.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  visit: { select: { id: true, date: true, diagnosis: true } },
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
    private readonly notifier: NotifierService,
  ) {}

  /**
   * Citas con su "preparación": última visita anterior y cuántos síntomas se
   * anotaron desde entonces (para no olvidar nada en la consulta).
   */
  async list(query: AppointmentQueryDto) {
    const appointments = await this.prisma.vetAppointment.findMany({
      where: {
        petId: query.petId,
        status: query.open ? 'SCHEDULED' : query.status,
      },
      include,
      orderBy: { scheduledAt: query.open ? 'asc' : 'desc' },
    });
    return Promise.all(appointments.map((a) => this.withPrep(a)));
  }

  private async withPrep<T extends VetAppointment>(a: T) {
    if (a.status !== 'SCHEDULED') return { ...a, prep: null };
    const lastVisit = await this.prisma.vetVisit.findFirst({
      where: { petId: a.petId, date: { lte: a.scheduledAt } },
      orderBy: { date: 'desc' },
      select: { date: true },
    });
    const symptomCount = await this.prisma.symptomLog.count({
      where: {
        petId: a.petId,
        ...(lastVisit && { occurredAt: { gt: lastVisit.date } }),
      },
    });
    return {
      ...a,
      prep: { lastVisitDate: lastVisit?.date ?? null, symptomCount },
    };
  }

  async create(dto: CreateAppointmentDto, user: AuthUser) {
    await this.pets.ensureExists(dto.petId);
    const a = await this.prisma.vetAppointment.create({
      data: {
        petId: dto.petId,
        scheduledAt: new Date(dto.scheduledAt),
        reason: dto.reason,
        vetName: dto.vetName ?? null,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
      },
      include,
    });
    if (a.scheduledAt > new Date()) {
      await this.notifier.broadcast(
        appointmentCreatedMessage({ ...a, createdBy: user.name }),
        {
          exceptUserId: user.id,
        },
      );
    }
    return this.withPrep(a);
  }

  async update(id: number, dto: UpdateAppointmentDto) {
    const current = await this.prisma.vetAppointment.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Cita no encontrada');
    if (dto.status === 'COMPLETED' && !current.visitId) {
      throw new BadRequestException(
        'Para completar la cita, registra el resultado de la visita',
      );
    }
    const a = await this.prisma.vetAppointment.update({
      where: { id },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        reason: dto.reason,
        vetName: dto.vetName,
        location: dto.location,
        notes: dto.notes,
        status: dto.status,
      },
      include,
    });
    return this.withPrep(a);
  }

  async remove(id: number) {
    const { count } = await this.prisma.vetAppointment.deleteMany({
      where: { id },
    });
    if (!count) throw new NotFoundException('Cita no encontrada');
    return { ok: true };
  }
}
