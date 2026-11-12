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
import {
  CreateWeightDto,
  UpdateWeightDto,
  WeightQueryDto,
} from './weights.dto.js';
import { WeightsService } from './weights.service.js';

@Controller('weights')
export class WeightsController {
  constructor(private readonly service: WeightsService) {}

  @Get()
  list(@Query() query: WeightQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateWeightDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWeightDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
