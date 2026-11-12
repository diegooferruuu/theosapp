import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { appTimezone, symptomPhotosDir } from '../common/config.js';
import { parseDateOnly, todayIn } from '../common/dates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePetDto, UpdatePetDto } from './pets.dto.js';

const optDate = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null ? null : parseDateOnly(v);

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.pet.findMany({ orderBy: { id: 'asc' } });
  }

  async get(id: number) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            healthRecords: true,
            treatments: true,
            groomingLogs: true,
            vetVisits: true,
            weights: true,
          },
        },
      },
    });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return pet;
  }

  async ensureExists(id: number) {
    const count = await this.prisma.pet.count({ where: { id } });
    if (!count) throw new NotFoundException('Mascota no encontrada');
  }

  async create(dto: CreatePetDto) {
    const today = parseDateOnly(todayIn(appTimezone()));
    return this.prisma.pet.create({
      data: {
        name: dto.name,
        species: dto.species ?? null,
        breed: dto.breed ?? null,
        birthDate: optDate(dto.birthDate) ?? null,
        notes: dto.notes ?? null,
        currentWeightKg: dto.weightKg ?? null,
        weights: dto.weightKg
          ? { create: { date: today, weightKg: dto.weightKg } }
          : undefined,
      },
    });
  }

  async update(id: number, dto: UpdatePetDto) {
    await this.ensureExists(id);
    return this.prisma.pet.update({
      where: { id },
      data: {
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        birthDate: optDate(dto.birthDate),
        notes: dto.notes,
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    const photos = await this.prisma.symptomPhoto.findMany({
      where: { symptom: { petId: id } },
      select: { filename: true },
    });
    await this.prisma.pet.delete({ where: { id } });
    // Las filas se borran en cascada; los archivos de fotos, a mano.
    for (const p of photos) {
      await unlink(join(symptomPhotosDir(), p.filename)).catch(() => undefined);
    }
    return { ok: true };
  }

  /** Crea las mascotas por defecto si la tabla está vacía. */
  async ensureDefaults(names: string[]) {
    if (!names.length || (await this.prisma.pet.count())) return;
    await this.prisma.pet.createMany({ data: names.map((name) => ({ name })) });
  }
}
