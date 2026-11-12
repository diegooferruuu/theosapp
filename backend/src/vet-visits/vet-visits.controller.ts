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
  CreateVetVisitDto,
  UpdateVetVisitDto,
  VetVisitQueryDto,
} from './vet-visits.dto.js';
import { VetVisitsService } from './vet-visits.service.js';

@Controller('vet-visits')
export class VetVisitsController {
  constructor(private readonly service: VetVisitsService) {}

  @Get()
  list(@Query() query: VetVisitQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateVetVisitDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVetVisitDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
