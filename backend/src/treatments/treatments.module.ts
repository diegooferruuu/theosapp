import { Module } from '@nestjs/common';
import { TreatmentsController } from './treatments.controller.js';
import { TreatmentsService } from './treatments.service.js';

@Module({
  controllers: [TreatmentsController],
  providers: [TreatmentsService],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
