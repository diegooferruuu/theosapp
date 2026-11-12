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
  CreateTreatmentDto,
  TreatmentQueryDto,
  UpdateTreatmentDto,
} from './treatments.dto.js';
import { TreatmentsService } from './treatments.service.js';

/** Tratamientos médicos (medicamentos). */
@Controller('treatments')
export class TreatmentsController {
  constructor(private readonly service: TreatmentsService) {}

  @Get()
  list(@Query() query: TreatmentQueryDto) {
    return this.service.list(query);
  }

  @Get(':id/schedule')
  schedule(@Param('id', ParseIntPipe) id: number) {
    return this.service.schedule(id);
  }

  @Post()
  create(@Body() dto: CreateTreatmentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTreatmentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
