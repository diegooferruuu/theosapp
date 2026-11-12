import { applyDecorators } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  FoodTiming,
  ScheduleType,
  TreatmentStatus,
  TreatmentType,
} from '../generated/prisma/enums.js';
import { EmptyToNull, Trim, TrimOrNull } from '../common/dto.js';
import { OptionalQueryId } from '../common/validators.js';

/** Número opcional; '' o null lo borran. */
const NullableNumber = (min: number, max: number, int = false) =>
  applyDecorators(
    EmptyToNull(),
    IsOptional(),
    ValidateIf((_o, v) => v !== null),
    int
      ? IsInt({ message: 'Debe ser un número entero' })
      : IsNumber({}, { message: 'Número inválido' }),
    Min(min),
    Max(max),
  );

const NullableText = (max: number) =>
  applyDecorators(IsOptional(), TrimOrNull(), IsString(), MaxLength(max));

/** Campos comunes a crear y editar (todos opcionales). */
class TreatmentFieldsDto {
  @IsOptional()
  @IsEnum(TreatmentType, { message: 'Tipo de tratamiento inválido' })
  type?: TreatmentType;

  /** Texto libre de la dosis (solo para el tipo "Otro"). */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(120)
  dosage?: string;

  @NullableText(40)
  strength?: string | null;

  @NullableNumber(0.01, 10_000)
  amount?: number | null;

  @NullableText(40)
  unit?: string | null;

  @NullableText(80)
  site?: string | null;

  @EmptyToNull()
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsEnum(FoodTiming)
  foodTiming?: FoodTiming | null;

  @NullableText(300)
  instructions?: string | null;

  @IsOptional()
  @IsEnum(ScheduleType, { message: 'Tipo de horario inválido' })
  scheduleType?: ScheduleType;

  /** null = sin fecha de fin. */
  @NullableNumber(1, 3650, true)
  durationDays?: number | null;

  @NullableNumber(1, 168, true)
  frequencyHours?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    each: true,
    message: 'Hora inválida (HH:MM)',
  })
  times?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  everyDays?: number;

  @NullableNumber(0.5, 168)
  minIntervalHours?: number | null;

  @NullableNumber(1, 48, true)
  maxPerDay?: number | null;

  @NullableNumber(0, 100_000)
  stockQuantity?: number | null;

  @NullableNumber(0, 100_000)
  stockAlertAt?: number | null;

  @IsOptional()
  @IsBoolean()
  notifyDoses?: boolean;

  @NullableText(2000)
  notes?: string | null;
}

export class CreateTreatmentDto extends TreatmentFieldsDto {
  @IsInt()
  @Min(1)
  petId: number;

  @Trim()
  @IsString()
  @MaxLength(120)
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  medicineName: string;

  /** Primera toma (cada X horas), o el día de inicio (horarios fijos / según necesidad). */
  @IsISO8601({}, { message: 'Fecha de inicio inválida' })
  startAt: string;
}

export class UpdateTreatmentDto extends TreatmentFieldsDto {
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
  @IsISO8601({}, { message: 'Fecha de inicio inválida' })
  startAt?: string;

  @IsOptional()
  @IsEnum(TreatmentStatus, { message: 'Estado inválido' })
  status?: TreatmentStatus;
}

export class TreatmentQueryDto {
  @OptionalQueryId()
  petId?: number;

  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
