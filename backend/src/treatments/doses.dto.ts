import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TrimOrNull } from '../common/dto.js';

export class GiveDoseDto {
  /** Número de toma (no hace falta en tratamientos "según necesidad"). */
  @IsOptional()
  @IsInt()
  @Min(1)
  doseNumber?: number;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
