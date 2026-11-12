import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Roles } from '../common/decorators.js';
import { NotificationsService } from './notifications.service.js';

@Roles('SUPERADMIN')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('logs')
  logs() {
    return this.notifications.recentLogs();
  }

  /** Ejecuta ahora la revisión diaria (ignora la hora configurada). */
  @Post('run-daily')
  @HttpCode(200)
  runDaily() {
    return this.notifications.runDailyAlerts();
  }
}
