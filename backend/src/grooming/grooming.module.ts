import { Module } from '@nestjs/common';
import { GroomingController } from './grooming.controller.js';
import { GroomingService } from './grooming.service.js';

@Module({
  controllers: [GroomingController],
  providers: [GroomingService],
  exports: [GroomingService],
})
export class GroomingModule {}
