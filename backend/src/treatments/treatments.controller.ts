import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators.js';
import { GiveDoseDto } from './doses.dto.js';
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

  /** Marca una toma como dada y avisa a los demás. */
  @Post(':id/doses')
  @HttpCode(200)
  giveDose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GiveDoseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.giveDose(id, dto, user);
  }

  @Delete(':id/doses/:doseNumber')
  undoDose(
    @Param('id', ParseIntPipe) id: number,
    @Param('doseNumber', ParseIntPipe) doseNumber: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.undoDose(id, doseNumber, user);
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
