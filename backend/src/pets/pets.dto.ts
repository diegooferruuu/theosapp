import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim, TrimOrNull } from '../common/dto.js';
import { IsOptionalDateOnly } from '../common/validators.js';

export class CreatePetDto {
  @Trim()
  @IsString()
  @MaxLength(60)
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(60)
  species?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(80)
  breed?: string | null;

  @IsOptionalDateOnly()
  birthDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  /** Peso inicial: crea un registro de peso con fecha de hoy. */
  @IsOptional()
  @IsNumber({}, { message: 'Peso inválido' })
  @Min(0.01)
  @Max(300)
  weightKg?: number;
}

export class UpdatePetDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(60)
  species?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(80)
  breed?: string | null;

  @IsOptionalDateOnly()
  birthDate?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
