import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { EmptyToNull, Trim, TrimOrNull } from '../common/dto.js';
import { IsDateOnly, OptionalQueryId } from '../common/validators.js';

export class CreateVetVisitDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsDateOnly()
  date: string;

  @Trim()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  reason: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  diagnosis?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(120)
  vetName?: string | null;

  @EmptyToNull()
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber({}, { message: 'Peso inválido' })
  @Min(0.01)
  @Max(300)
  weightKg?: number | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateVetVisitDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  petId?: number;

  @IsOptional()
  @IsDateOnly()
  date?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  reason?: string;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  diagnosis?: string | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(120)
  vetName?: string | null;

  @EmptyToNull()
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber({}, { message: 'Peso inválido' })
  @Min(0.01)
  @Max(300)
  weightKg?: number | null;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class VetVisitQueryDto {
  @OptionalQueryId()
  petId?: number;
}
