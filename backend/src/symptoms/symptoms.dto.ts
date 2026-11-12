import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Severity, SymptomCategory } from '../generated/prisma/enums.js';
import { TrimOrNull } from '../common/dto.js';
import { OptionalQueryId } from '../common/validators.js';

export class CreateSymptomDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsEnum(SymptomCategory, { message: 'Síntoma inválido' })
  category: SymptomCategory;

  @IsOptional()
  @IsEnum(Severity, { message: 'Intensidad inválida' })
  severity?: Severity;

  @IsISO8601({}, { message: 'Fecha y hora inválidas' })
  occurredAt: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class UpdateSymptomDto {
  @IsOptional()
  @IsEnum(SymptomCategory, { message: 'Síntoma inválido' })
  category?: SymptomCategory;

  @IsOptional()
  @IsEnum(Severity, { message: 'Intensidad inválida' })
  severity?: Severity;

  @IsOptional()
  @IsISO8601({}, { message: 'Fecha y hora inválidas' })
  occurredAt?: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class SymptomQueryDto {
  @OptionalQueryId()
  petId?: number;

  /** Solo los posteriores a esta fecha (ISO). */
  @IsOptional()
  @IsISO8601()
  since?: string;

  /** Solo los últimos N días. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  days?: number;
}
