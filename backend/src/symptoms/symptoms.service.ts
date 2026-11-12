import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appTimezone, symptomPhotosDir } from '../common/config.js';
import { formatTime } from '../common/dates.js';
import type { AuthUser } from '../common/decorators.js';
import { SEVERITY_LABEL, SYMPTOM_LABEL } from '../common/labels.js';
import { NotifierService } from '../notifier/notifier.service.js';
import { PetsService } from '../pets/pets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateSymptomDto,
  SymptomQueryDto,
  UpdateSymptomDto,
} from './symptoms.dto.js';

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const include = {
  pet: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  photos: { select: { id: true }, orderBy: { id: 'asc' } },
} as const;

const photosDir = symptomPhotosDir;

@Injectable()
export class SymptomsService {
  private readonly logger = new Logger('Síntomas');

  constructor(
    private readonly prisma: PrismaService,
    private readonly pets: PetsService,
    private readonly notifier: NotifierService,
  ) {}

  list(query: SymptomQueryDto) {
    return this.prisma.symptomLog.findMany({
      where: {
        petId: query.petId,
        occurredAt: query.since
          ? { gt: new Date(query.since) }
          : query.days
            ? { gte: new Date(Date.now() - query.days * 86_400_000) }
            : undefined,
      },
      include,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
  }

  async create(dto: CreateSymptomDto, user: AuthUser) {
    await this.pets.ensureExists(dto.petId);
    const occurredAt = new Date(dto.occurredAt);
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
      throw new BadRequestException('La fecha no puede ser futura');
    }
    const s = await this.prisma.symptomLog.create({
      data: {
        petId: dto.petId,
        category: dto.category,
        severity: dto.severity ?? 'MILD',
        occurredAt,
        description: dto.description ?? null,
        createdById: user.id,
      },
      include,
    });

    // Avisa al resto si es de las últimas 24 h (no al cargar historial viejo).
    if (Date.now() - occurredAt.getTime() < 24 * 3_600_000) {
      const label = SYMPTOM_LABEL[s.category];
      const severity = SEVERITY_LABEL[s.severity];
      await this.notifier.broadcast(
        {
          title: `${s.severity === 'SEVERE' ? '🚨' : '🩺'} ${s.pet.name}: ${label.toLowerCase()} (${severity})`,
          body: [
            s.description?.slice(0, 140),
            `Lo anotó ${user.name} · ${formatTime(occurredAt, appTimezone())}`,
          ]
            .filter(Boolean)
            .join('\n'),
          url: '/sintomas',
          tag: `sintoma-${s.id}`,
          ttl: 12 * 3600,
          urgency: s.severity === 'MILD' ? 'normal' : 'high',
        },
        { exceptUserId: user.id },
      );
    }
    return s;
  }

  async update(id: number, dto: UpdateSymptomDto) {
    await this.ensureExists(id);
    return this.prisma.symptomLog.update({
      where: { id },
      data: {
        category: dto.category,
        severity: dto.severity,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
        description: dto.description,
      },
      include,
    });
  }

  async remove(id: number) {
    const s = await this.prisma.symptomLog.findUnique({
      where: { id },
      include: { photos: true },
    });
    if (!s) throw new NotFoundException('Registro no encontrado');
    await this.prisma.symptomLog.delete({ where: { id } });
    await this.deleteFiles(s.photos.map((p) => p.filename));
    return { ok: true };
  }

  async addPhotos(id: number, files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('No llegó ninguna foto');
    const existing = await this.prisma.symptomPhoto.count({
      where: { symptomId: id },
    });
    await this.ensureExists(id);
    if (existing + files.length > MAX_PHOTOS) {
      throw new BadRequestException(`Máximo ${MAX_PHOTOS} fotos por registro`);
    }
    for (const f of files) {
      if (!EXT[f.mimetype])
        throw new BadRequestException(
          'Solo se aceptan imágenes JPG, PNG, WEBP o HEIC',
        );
      if (f.size > MAX_PHOTO_BYTES)
        throw new BadRequestException('Cada foto puede pesar hasta 8 MB');
    }
    await mkdir(photosDir(), { recursive: true });
    for (const f of files) {
      const filename = `${randomUUID()}.${EXT[f.mimetype]}`;
      await writeFile(join(photosDir(), filename), f.buffer);
      await this.prisma.symptomPhoto.create({
        data: { symptomId: id, filename, mimeType: f.mimetype, size: f.size },
      });
    }
    return this.prisma.symptomLog.findUniqueOrThrow({ where: { id }, include });
  }

  async photo(photoId: number) {
    const p = await this.prisma.symptomPhoto.findUnique({
      where: { id: photoId },
    });
    if (!p) throw new NotFoundException('Foto no encontrada');
    return { path: join(photosDir(), p.filename), mimeType: p.mimeType };
  }

  async removePhoto(photoId: number) {
    const p = await this.prisma.symptomPhoto.findUnique({
      where: { id: photoId },
    });
    if (!p) throw new NotFoundException('Foto no encontrada');
    await this.prisma.symptomPhoto.delete({ where: { id: photoId } });
    await this.deleteFiles([p.filename]);
    return { ok: true };
  }

  private async deleteFiles(names: string[]) {
    for (const name of names) {
      await unlink(join(photosDir(), name)).catch(
        (e: NodeJS.ErrnoException) => {
          if (e.code !== 'ENOENT')
            this.logger.warn(`No se pudo borrar ${name}: ${e.message}`);
        },
      );
    }
  }

  private async ensureExists(id: number) {
    const count = await this.prisma.symptomLog.count({ where: { id } });
    if (!count) throw new NotFoundException('Registro no encontrado');
  }
}
