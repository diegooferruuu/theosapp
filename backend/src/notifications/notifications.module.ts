import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { PushModule } from '../push/push.module.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { TreatmentsModule } from '../treatments/treatments.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotifierService } from './notifier.service.js';

@Module({
  imports: [TelegramModule, PushModule, DashboardModule, TreatmentsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotifierService],
})
export class NotificationsModule {}
