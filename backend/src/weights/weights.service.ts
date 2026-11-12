import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseDateOnly } from '../common/dates.js';
import { refreshPetWeight } from '../pets/pet-weight.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateWeightDto,
  UpdateWeightDto,
  WeightQueryDto,
} from './weights.dto.js';

const include = {
  pet: { select: { id: true, name: true } },
  vetVisit: { select: { id: true, reason: true } },
} as const;

@Injectable()
export class WeightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
  ) {}

  list(query: WeightQueryDto) {
    return this.prisma.weightRecord.findMany({
      where: { petId: query.petId },
      include,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });
  }

  async create(dto: CreateWeightDto) {
    await this.pets.ensureExists(dto.petId);
    const record = await this.prisma.weightRecord.create({
      data: {
        petId: dto.petId,
        date: parseDateOnly(dto.date),
        weightKg: dto.weightKg,
        notes: dto.notes ?? null,
      },
      include,
    });
    await refreshPetWeight(this.prisma, dto.petId);
    return record;
  }

  async update(id: number, dto: UpdateWeightDto) {
    const current = await this.findEditable(id);
    const record = await this.prisma.weightRecord.update({
      where: { id },
      data: {
        date: dto.date ? parseDateOnly(dto.date) : undefined,
        weightKg: dto.weightKg,
        notes: dto.notes,
      },
      include,
    });
    await refreshPetWeight(this.prisma, current.petId);
    return record;
  }

  async remove(id: number) {
    const current = await this.findEditable(id);
    await this.prisma.weightRecord.delete({ where: { id } });
    await refreshPetWeight(this.prisma, current.petId);
    return { ok: true };
  }

  private async findEditable(id: number) {
    const record = await this.prisma.weightRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Registro de peso no encontrado');
    if (record.vetVisitId) {
      throw new BadRequestException(
        'Este peso viene de una visita al veterinario; edítalo desde la visita',
      );
    }
    return record;
  }
}
