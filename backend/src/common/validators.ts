import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min, ValidateIf } from 'class-validator';
import { EmptyToNull } from './dto.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha obligatoria 'YYYY-MM-DD'. */
export const IsDateOnly = () =>
  applyDecorators(
    Matches(DATE_ONLY, { message: 'Fecha inválida (AAAA-MM-DD)' }),
  );

/** Fecha opcional 'YYYY-MM-DD'; '' o null la borran. */
export const IsOptionalDateOnly = () =>
  applyDecorators(
    EmptyToNull(),
    IsOptional(),
    ValidateIf((_o, v) => v !== null),
    Matches(DATE_ONLY, { message: 'Fecha inválida (AAAA-MM-DD)' }),
  );

/** Id numérico en query string. */
export const OptionalQueryId = () =>
  applyDecorators(
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
  );
