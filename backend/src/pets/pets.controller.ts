import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators.js';
import { CreatePetDto, UpdatePetDto } from './pets.dto.js';
import { PetsService } from './pets.service.js';

@Controller('pets')
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Get()
  list() {
    return this.pets.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.pets.get(id);
  }

  @Post()
  create(@Body() dto: CreatePetDto) {
    return this.pets.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePetDto) {
    return this.pets.update(id, dto);
  }

  /** Elimina la mascota y todo su historial: solo superadmin. */
  @Roles('SUPERADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pets.remove(id);
  }
}
