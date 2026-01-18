import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { UploadModule } from './modules/upload/upload.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AdminModule } from './modules/admin/admin.module';
import { ClinicalModule } from './modules/clinical/clinical.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TherapyGoalsModule } from './modules/therapy-goals/therapy-goals.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
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
  ],
  controllers: [HealthController],
})
export class AppModule { }
