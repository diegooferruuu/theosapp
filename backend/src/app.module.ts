import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { BootstrapService } from './bootstrap/bootstrap.service.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { GroomingModule } from './grooming/grooming.module.js';
import { HealthController } from './health.controller.js';
import { HealthRecordsModule } from './health-records/health-records.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { NotifierModule } from './notifier/notifier.module.js';
import { PetsModule } from './pets/pets.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PushModule } from './push/push.module.js';
import { TreatmentsModule } from './treatments/treatments.module.js';
import { UsersModule } from './users/users.module.js';
import { VetVisitsModule } from './vet-visits/vet-visits.module.js';
import { WeightsModule } from './weights/weights.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    PetsModule,
    AuthModule,
    UsersModule,
    HealthRecordsModule,
    TreatmentsModule,
    GroomingModule,
    VetVisitsModule,
    WeightsModule,
    DashboardModule,
    PushModule,
    NotifierModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [BootstrapService],
})
export class AppModule {}
