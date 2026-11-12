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
  CreateGroomingDto,
  GroomingQueryDto,
  UpdateGroomingDto,
} from './grooming.dto.js';
import { GroomingService } from './grooming.service.js';

/** Higiene y estética. */
@Controller('grooming')
export class GroomingController {
  constructor(private readonly service: GroomingService) {}

  @Get()
  list(@Query() query: GroomingQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateGroomingDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroomingDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
