import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(64)
  @IsNotEmpty({ message: 'Ingresa tu usuario' })
  username: string;

  @IsString()
  @MaxLength(200)
  @IsNotEmpty({ message: 'Ingresa tu contraseña' })
  password: string;
}
