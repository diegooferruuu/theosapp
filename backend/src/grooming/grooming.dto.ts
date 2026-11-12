import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { GroomingServiceType } from '../generated/prisma/enums.js';
import { TrimOrNull } from '../common/dto.js';
import {
  IsDateOnly,
  IsOptionalDateOnly,
  OptionalQueryId,
} from '../common/validators.js';

export class CreateGroomingDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsEnum(GroomingServiceType, { message: 'Tipo de servicio inválido' })
  serviceType: GroomingServiceType;

  @IsDateOnly()
  dateDone: string;

  @IsOptionalDateOnly()
  nextDueDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateGroomingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  petId?: number;

  @IsOptional()
  @IsEnum(GroomingServiceType, { message: 'Tipo de servicio inválido' })
  serviceType?: GroomingServiceType;

  @IsOptional()
  @IsDateOnly()
  dateDone?: string;

  @IsOptionalDateOnly()
  nextDueDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class GroomingQueryDto {
  @OptionalQueryId()
  petId?: number;

  @IsOptional()
  @IsEnum(GroomingServiceType)
  serviceType?: GroomingServiceType;
}
