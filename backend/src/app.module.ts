import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { UploadModule } from './modules/upload/upload.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { PredictModule } from './modules/predict/predict.module';
import { HealthController } from './health.controller';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { CommonModule } from './common/common.module';

import { TherapyGoalsModule } from './modules/therapy-goals/therapy-goals.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CaregiverScheduleModule } from './modules/caregiver-schedule/caregiver-schedule.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // Time window in milliseconds (60 seconds)
      limit: 100, // Max requests per ttl window
    }]),

    // Feature Modules
    AuthModule,
    UsersModule,
    EmailModule,
    UploadModule,
    InvitationModule,
    PatientsModule,
    AdminModule,
    ClinicalModule,
    DashboardModule,
    TherapyGoalsModule,
    PredictModule,
    CaregiverScheduleModule,
    CommonModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
