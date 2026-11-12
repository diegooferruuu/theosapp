import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { HealthRecordType } from '../generated/prisma/enums.js';
import { Trim, TrimOrNull } from '../common/dto.js';
import {
  IsDateOnly,
  IsOptionalDateOnly,
  OptionalQueryId,
} from '../common/validators.js';

export class CreateHealthRecordDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsEnum(HealthRecordType, { message: 'Tipo inválido' })
  type: HealthRecordType;

  @Trim()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  name: string;

  @IsDateOnly()
  dateGiven: string;

  @IsOptionalDateOnly()
  nextDueDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateHealthRecordDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  petId?: number;

  @IsOptional()
  @IsEnum(HealthRecordType, { message: 'Tipo inválido' })
  type?: HealthRecordType;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateOnly()
  dateGiven?: string;

  @IsOptionalDateOnly()
  nextDueDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class HealthRecordQueryDto {
  @OptionalQueryId()
  petId?: number;

  @IsOptional()
  @IsEnum(HealthRecordType)
  type?: HealthRecordType;
}
