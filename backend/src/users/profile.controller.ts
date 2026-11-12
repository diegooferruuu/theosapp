import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/decorators.js';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../auth/auth.constants.js';
import { ChangePasswordDto, UpdateProfileDto } from './users.dto.js';
import { UsersService } from './users.service.js';

/** Endpoints del usuario autenticado sobre su propia cuenta. */
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly users: UsersService,
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
}
