import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CaregiverSchedule, CaregiverScheduleSchema } from './schemas/caregiver-schedule.schema';
import { CaregiverScheduleService } from './caregiver-schedule.service';
import { CaregiverScheduleController } from './caregiver-schedule.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CaregiverSchedule.name, schema: CaregiverScheduleSchema },
    ]),
    AuthModule,
  ],
  controllers: [CaregiverScheduleController],
  providers: [CaregiverScheduleService],
  exports: [CaregiverScheduleService],
})
export class CaregiverScheduleModule {}
