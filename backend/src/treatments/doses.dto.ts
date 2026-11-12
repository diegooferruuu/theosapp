import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TrimOrNull } from '../common/dto.js';

export class GiveDoseDto {
  @IsInt()
  @Min(1)
  doseNumber: number;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
