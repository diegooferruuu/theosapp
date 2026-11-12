import { Injectable, NotFoundException } from '@nestjs/common';
import { parseDateOnly } from '../common/dates.js';
import { refreshPetWeight } from '../pets/pet-weight.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateVetVisitDto,
  UpdateVetVisitDto,
  VetVisitQueryDto,
} from './vet-visits.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class VetVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
  ) {}

  list(query: VetVisitQueryDto) {
    return this.prisma.vetVisit.findMany({
      where: { petId: query.petId },
      include,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateVetVisitDto, userId: number) {
    await this.pets.ensureExists(dto.petId);
    const date = parseDateOnly(dto.date);
    const visit = await this.prisma.vetVisit.create({
      data: {
        petId: dto.petId,
        date,
        reason: dto.reason,
        diagnosis: dto.diagnosis ?? null,
        vetName: dto.vetName ?? null,
        weightKg: dto.weightKg ?? null,
        notes: dto.notes ?? null,
        createdById: userId,
        weightRecord: dto.weightKg
          ? { create: { petId: dto.petId, date, weightKg: dto.weightKg } }
          : undefined,
      },
      include,
    });
    if (dto.weightKg) await refreshPetWeight(this.prisma, dto.petId);
    return visit;
  }

  async update(id: number, dto: UpdateVetVisitDto) {
    const current = await this.prisma.vetVisit.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Visita no encontrada');
    if (dto.petId) await this.pets.ensureExists(dto.petId);

    const visit = await this.prisma.vetVisit.update({
      where: { id },
      data: {
        petId: dto.petId,
        date: dto.date ? parseDateOnly(dto.date) : undefined,
        reason: dto.reason,
        diagnosis: dto.diagnosis,
        vetName: dto.vetName,
        weightKg: dto.weightKg,
        notes: dto.notes,
      },
      include,
    });

    // Mantener sincronizado el registro de peso asociado a la visita.
    if (visit.weightKg) {
      await this.prisma.weightRecord.upsert({
        where: { vetVisitId: id },
        update: {
          petId: visit.petId,
          date: visit.date,
          weightKg: visit.weightKg,
        },
        create: {
          vetVisitId: id,
          petId: visit.petId,
          date: visit.date,
          weightKg: visit.weightKg,
        },
      });
    } else {
      await this.prisma.weightRecord.deleteMany({ where: { vetVisitId: id } });
    }
    await refreshPetWeight(this.prisma, visit.petId);
    if (current.petId !== visit.petId) {
      await refreshPetWeight(this.prisma, current.petId);
    }
    return visit;
  }

  async remove(id: number) {
    const visit = await this.prisma.vetVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visita no encontrada');
    await this.prisma.vetVisit.delete({ where: { id } });
    await refreshPetWeight(this.prisma, visit.petId);
    return { ok: true };
  }
}
