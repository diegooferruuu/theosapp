import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TrimOrNull } from '../common/dto.js';
import { IsDateOnly, OptionalQueryId } from '../common/validators.js';

export class CreateWeightDto {
  @IsInt()
  @Min(1)
  petId: number;

  @IsDateOnly()
  date: string;

  @IsNumber({}, { message: 'Peso inválido' })
  @Min(0.01)
  @Max(300)
  weightKg: number;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class UpdateWeightDto {
  @IsOptional()
  @IsDateOnly()
  date?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Peso inválido' })
  @Min(0.01)
  @Max(300)
  weightKg?: number;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class WeightQueryDto {
  @OptionalQueryId()
  petId?: number;
}
