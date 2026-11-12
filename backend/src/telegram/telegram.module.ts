import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { TelegramService } from './telegram.service.js';

@Module({
  imports: [DashboardModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
