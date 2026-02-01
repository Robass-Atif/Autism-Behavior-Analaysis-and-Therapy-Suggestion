import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { PatientsModule } from '../patients/patients.module';
import { SystemMetric, SystemMetricSchema } from './schemas/system-metric.schema';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PatientsModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: SystemMetric.name, schema: SystemMetricSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule { }
