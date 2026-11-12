import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../generated/prisma/enums.js';
import { Trim, TrimOrNull } from '../common/dto.js';

const lower = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

const USERNAME = /^[a-z0-9._-]{3,32}$/;
const USERNAME_MSG =
  'El usuario debe tener 3-32 caracteres: letras minúsculas, números, punto, guion o guion bajo';

export class CreateUserDto {
  @Trim()
  @IsString()
  @MaxLength(80)
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @lower()
  @Matches(USERNAME, { message: USERNAME_MSG })
  username: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(32)
  telegramChatId?: string | null;
}

export class UpdateUserDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @lower()
  @Matches(USERNAME, { message: USERNAME_MSG })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @TrimOrNull()
  @IsString()
  @MaxLength(32)
  telegramChatId?: string | null;
}

export class UpdateProfileDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu contraseña actual' })
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(200)
  newPassword: string;
}
