import { Injectable, NotFoundException } from '@nestjs/common';
import type { MedicationTreatment } from '../generated/prisma/client.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { doseTimes, treatmentEnd, treatmentProgress } from './schedule.js';
import {
  CreateTreatmentDto,
  TreatmentQueryDto,
  UpdateTreatmentDto,
} from './treatments.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TreatmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
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

  async list(query: TreatmentQueryDto) {
    const treatments = await this.prisma.medicationTreatment.findMany({
      where: { petId: query.petId, status: query.status },
      include,
      orderBy: [{ status: 'asc' }, { startAt: 'desc' }],
    });
    const now = new Date();
    return treatments.map((t) => ({
      ...t,
      progress: treatmentProgress(t, now),
    }));
  }

  async schedule(id: number) {
    const t = await this.prisma.medicationTreatment.findUnique({
      where: { id },
      include,
    });
    if (!t) throw new NotFoundException('Tratamiento no encontrado');
    const now = new Date();
    return {
      ...t,
      progress: treatmentProgress(t, now),
      doses: doseTimes(t).map((at, i) => ({
        number: i + 1,
        at,
        past: at <= now,
      })),
    };
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
    return { ...t, progress: treatmentProgress(t) };
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
      include,
    });
    return { ...t, progress: treatmentProgress(t) };
  }

  async remove(id: number) {
    const { count } = await this.prisma.medicationTreatment.deleteMany({
      where: { id },
    });
    if (!count) throw new NotFoundException('Tratamiento no encontrado');
    return { ok: true };
  }
}
