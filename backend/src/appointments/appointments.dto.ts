import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AppointmentStatus } from '../generated/prisma/enums.js';
import { Trim, TrimOrNull } from '../common/dto.js';
import { OptionalQueryId } from '../common/validators.js';

export class CreateAppointmentDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsISO8601({}, { message: 'Fecha y hora inválidas' })
  scheduledAt: string;

  @Trim()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty({ message: 'Indica el motivo de la cita' })
  reason: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(120)
  vetName?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsISO8601({}, { message: 'Fecha y hora inválidas' })
  scheduledAt?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  reason?: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(120)
  vetName?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'Estado inválido' })
  status?: AppointmentStatus;
}

export class AppointmentQueryDto {
  @OptionalQueryId()
  petId?: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  /** Solo las que aún no se registraron (programadas). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  open?: boolean;
}
