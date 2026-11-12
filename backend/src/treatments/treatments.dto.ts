import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TreatmentStatus } from '../generated/prisma/enums.js';
import { Trim, TrimOrNull } from '../common/dto.js';
import { OptionalQueryId } from '../common/validators.js';

export class CreateTreatmentDto {
  @IsInt()
  @Min(1)
  petId: number;

  @Trim()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty({ message: 'El medicamento es obligatorio' })
  medicineName: string;

  @Trim()
  @IsString()
  @MaxLength(80)
  @IsNotEmpty({ message: 'La dosis es obligatoria' })
  dosage: string;

  @IsISO8601({}, { message: 'Fecha y hora de inicio inválida' })
  startAt: string;

  @IsInt({ message: 'La duración debe ser un número de días' })
  @Min(1)
  @Max(365)
  durationDays: number;

  @IsInt({ message: 'La frecuencia debe ser un número de horas' })
  @Min(1)
  @Max(168)
  frequencyHours: number;

  @IsOptional()
  @IsBoolean()
  notifyDoses?: boolean;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateTreatmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  petId?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty()
  medicineName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  dosage?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Fecha y hora de inicio inválida' })
  startAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  frequencyHours?: number;

  @IsOptional()
  @IsEnum(TreatmentStatus, { message: 'Estado inválido' })
  status?: TreatmentStatus;

  @IsOptional()
  @IsBoolean()
  notifyDoses?: boolean;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class TreatmentQueryDto {
  @OptionalQueryId()
  petId?: number;

  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
