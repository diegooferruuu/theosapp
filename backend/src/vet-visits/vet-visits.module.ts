import { Module } from '@nestjs/common';
import { VetVisitsController } from './vet-visits.controller.js';
import { VetVisitsService } from './vet-visits.service.js';

@Module({
  controllers: [VetVisitsController],
  providers: [VetVisitsService],
})
export class VetVisitsModule {}
