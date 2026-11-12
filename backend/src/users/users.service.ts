import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from '../common/decorators.js';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './users.dto.js';

export const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  active: true,
  telegramChatId: true,
  notificationsEnabled: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const hash = (password: string) => bcrypt.hash(password, 10);

function rethrowUnique(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException('Ese nombre de usuario ya está en uso');
  }
  throw e;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          username: dto.username,
          passwordHash: await hash(dto.password),
          role: dto.role ?? 'USER',
          telegramChatId: dto.telegramChatId ?? null,
        },
        select: USER_SELECT,
      });
    } catch (e) {
      rethrowUnique(e);
    }
  }

  async update(id: number, dto: UpdateUserDto, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    if (id === actor.id) {
      if (dto.active === false) {
        throw new BadRequestException('No puedes desactivar tu propio usuario');
      }
      if (dto.role && dto.role !== 'SUPERADMIN') {
        throw new BadRequestException(
          'No puedes quitarte el rol de superadmin',
        );
      }
    }
    if (
      target.role === 'SUPERADMIN' &&
      ((dto.role && dto.role !== 'SUPERADMIN') || dto.active === false)
    ) {
      await this.ensureAnotherSuperadmin(id);
    }

    const invalidateSessions =
      dto.password !== undefined ||
      dto.active === false ||
      (dto.role !== undefined && dto.role !== target.role);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
          username: dto.username,
          role: dto.role,
          active: dto.active,
          notificationsEnabled: dto.notificationsEnabled,
          telegramChatId: dto.telegramChatId,
          passwordHash: dto.password ? await hash(dto.password) : undefined,
          tokenVersion: invalidateSessions ? { increment: 1 } : undefined,
        },
        select: USER_SELECT,
      });
    } catch (e) {
      rethrowUnique(e);
    }
  }

  async remove(id: number, actor: AuthUser) {
    if (id === actor.id) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.role === 'SUPERADMIN') await this.ensureAnotherSuperadmin(id);
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureAnotherSuperadmin(excludeId: number) {
    const others = await this.prisma.user.count({
      where: { role: 'SUPERADMIN', active: true, id: { not: excludeId } },
    });
    if (others === 0) {
      throw new BadRequestException(
        'Debe existir al menos un superadmin activo',
      );
    }
  }

  // ───────────── Perfil propio ─────────────

  async getProfile(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  updateProfile(id: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name, notificationsEnabled: dto.notificationsEnabled },
      select: USER_SELECT,
    });
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hash(dto.newPassword),
        tokenVersion: { increment: 1 },
      },
      select: { id: true, tokenVersion: true, role: true },
    });
  }

  async createTelegramLinkCode(id: number) {
    const code = randomBytes(9).toString('base64url');
    await this.prisma.user.update({
      where: { id },
      data: {
        telegramLinkCode: code,
        telegramLinkExpiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });
    return code;
  }

  unlinkTelegram(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { telegramChatId: null, telegramLinkCode: null },
      select: USER_SELECT,
    });
  }

  // ───────────── Arranque ─────────────

  /** Crea el superadmin inicial desde variables de entorno si aún no existe ninguno. */
  async ensureSuperadmin(env: {
    username?: string;
    password?: string;
    name?: string;
  }) {
    const existing = await this.prisma.user.count({
      where: { role: 'SUPERADMIN' },
    });
    if (existing > 0) return;

    const username = env.username?.trim().toLowerCase();
    if (!username || !env.password) {
      this.logger.warn(
        'No hay superadmin y faltan SUPERADMIN_USERNAME / SUPERADMIN_PASSWORD',
      );
      return;
    }
    const passwordHash = await hash(env.password);
    await this.prisma.user.upsert({
      where: { username },
      update: { role: 'SUPERADMIN', active: true, passwordHash },
      create: {
        username,
        name: env.name?.trim() || username,
        passwordHash,
        role: 'SUPERADMIN',
      },
    });
    this.logger.log(`Superadmin inicial "${username}" creado`);
  }
}
