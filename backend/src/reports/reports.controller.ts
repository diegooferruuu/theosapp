import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';

@Controller('pets')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Historial médico en PDF. ?months=12 (0 = todo). */
  @Get(':id/report.pdf')
  async report(
    @Param('id', ParseIntPipe) id: number,
    @Query('months') months: string | undefined,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    const m = Math.min(120, Math.max(0, Number(months ?? 12) || 0));
    const { doc, filename } = await this.reports.petReport(id, m);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    doc.pipe(res);
    doc.end();
  }
}
