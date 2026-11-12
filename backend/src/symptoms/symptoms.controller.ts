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
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/decorators.js';
import {
  CreateSymptomDto,
  SymptomQueryDto,
  UpdateSymptomDto,
} from './symptoms.dto.js';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  SymptomsService,
} from './symptoms.service.js';

/** Diario de síntomas con fotos. */
@Controller('symptoms')
export class SymptomsController {
  constructor(private readonly service: SymptomsService) {}

  @Get()
  list(@Query() query: SymptomQueryDto) {
    return this.service.list(query);
  }

  @Post()
  create(@Body() dto: CreateSymptomDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSymptomDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('photos', MAX_PHOTOS, {
      limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS },
    }),
  )
  addPhotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.addPhotos(id, files);
  }

  @Get('photos/:photoId')
  async photo(
    @Param('photoId', ParseIntPipe) photoId: number,
    @Res() res: Response,
  ) {
    const { path, mimeType } = await this.service.photo(photoId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=604800, immutable');
    res.sendFile(path, (err) => {
      if (err && !res.headersSent)
        res.status(404).json({ message: 'Foto no encontrada' });
    });
  }

  @Delete('photos/:photoId')
  removePhoto(@Param('photoId', ParseIntPipe) photoId: number) {
    return this.service.removePhoto(photoId);
  }
}
