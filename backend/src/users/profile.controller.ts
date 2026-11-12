import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/decorators.js';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../auth/auth.constants.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { ChangePasswordDto, UpdateProfileDto } from './users.dto.js';
import { UsersService } from './users.service.js';

/** Endpoints del usuario autenticado sobre su propia cuenta. */
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly users: UsersService,
    private readonly telegram: TelegramService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const updated = await this.users.changePassword(user.id, dto);
    // El cambio invalida otras sesiones; renovamos la cookie de la actual.
    const token = await this.jwt.signAsync({
      sub: updated.id,
      role: updated.role,
      tv: updated.tokenVersion,
    });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    return { ok: true };
  }

  @Get('telegram')
  telegramStatus(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.id).then((p) => ({
      linked: Boolean(p.telegramChatId),
      botEnabled: this.telegram.enabled,
      botUsername: this.telegram.botUsername,
    }));
  }

  @Post('telegram/link')
  @HttpCode(200)
  async telegramLink(@CurrentUser() user: AuthUser) {
    if (!this.telegram.enabled || !this.telegram.botUsername) {
      throw new ServiceUnavailableException(
        'El bot de Telegram no está configurado (falta TELEGRAM_BOT_TOKEN)',
      );
    }
    const code = await this.users.createTelegramLinkCode(user.id);
    return {
      url: `https://t.me/${this.telegram.botUsername}?start=${code}`,
      botUsername: this.telegram.botUsername,
      expiresInMinutes: 15,
    };
  }

  @Delete('telegram')
  telegramUnlink(@CurrentUser() user: AuthUser) {
    return this.users.unlinkTelegram(user.id);
  }

  @Post('telegram/test')
  @HttpCode(200)
  async telegramTest(@CurrentUser() user: AuthUser) {
    const profile = await this.users.getProfile(user.id);
    if (!profile.telegramChatId) {
      throw new ServiceUnavailableException(
        'Tu cuenta no está vinculada a Telegram',
      );
    }
    await this.telegram.sendMessage(
      profile.telegramChatId,
      `🐾 ¡Hola ${profile.name}! Las notificaciones de Theo’s App funcionan correctamente.`,
    );
    return { ok: true };
  }
}
