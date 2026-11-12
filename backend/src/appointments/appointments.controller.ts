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
  AppointmentQueryDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './appointments.dto.js';
import { AppointmentsService } from './appointments.service.js';

/** Citas con el veterinario. */
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Get()
  list(@Query() query: AppointmentQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
