import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/decorators.js';
import { PushSubscribeDto, PushUnsubscribeDto } from './push.dto.js';
import { PushService } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('config')
  async config(@CurrentUser() user: AuthUser) {
    return {
      enabled: this.push.enabled,
      publicKey: this.push.publicKey,
      devices: await this.push.countForUser(user.id),
    };
  }

  @Post('subscribe')
  @HttpCode(200)
  subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: PushSubscribeDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.push.subscribe(user.id, dto, userAgent);
  }

  @Post('unsubscribe')
  @HttpCode(200)
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: PushUnsubscribeDto) {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }

  @Post('test')
  @HttpCode(200)
  async test(@CurrentUser() user: AuthUser) {
    const delivered = await this.push.sendToUser(user.id, {
      title: 'Theo’s App 🐾',
      body: `¡Hola ${user.name}! Las notificaciones de este dispositivo funcionan.`,
      html: '',
      url: '/perfil',
      tag: 'test',
      ttl: 600,
    });
    if (!delivered) {
      throw new ServiceUnavailableException(
        'No hay dispositivos activos para tu cuenta. Vuelve a activar las notificaciones.',
      );
    }
    return { delivered };
  }
}
