import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/decorators.js';
import {
  CreateHealthRecordDto,
  HealthRecordQueryDto,
  UpdateHealthRecordDto,
} from './health-records.dto.js';
import { HealthRecordsService } from './health-records.service.js';

/** Vacunas y desparasitaciones. */
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly service: HealthRecordsService) {}

  @Get()
  list(@Query() query: HealthRecordQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateHealthRecordDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHealthRecordDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
