import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PetsService } from '../pets/pets.service.js';
import { UsersService } from '../users/users.service.js';

/** Datos iniciales: superadmin y mascotas por defecto. */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly users: UsersService,
    private readonly pets: PetsService,
  ) {}

  async onApplicationBootstrap() {
    await this.users.ensureSuperadmin({
      username: process.env.SUPERADMIN_USERNAME,
      password: process.env.SUPERADMIN_PASSWORD,
      name: process.env.SUPERADMIN_NAME,
    });
    await this.pets.ensureDefaults(
      (process.env.DEFAULT_PETS ?? 'Theo,Jovero')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    );
  }
}
