import { Module } from '@nestjs/common';
import { HealthRecordsController } from './health-records.controller.js';
import { HealthRecordsService } from './health-records.service.js';

@Module({
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
