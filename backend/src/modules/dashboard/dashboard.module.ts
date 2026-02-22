import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { PatientCaregiver, PatientCaregiverSchema } from '../patients/schemas/patient-caregiver.schema';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Therapist, TherapistSchema } from '../users/schemas/therapist.schema';
import { Caregiver, CaregiverSchema } from '../users/schemas/caregiver.schema';
import { Admin, AdminSchema } from '../users/schemas/admin.schema';
import { TherapyGoal, TherapyGoalSchema } from '../therapy-goals/schemas/therapy-goal.schema';

import { VideoSession, VideoSessionSchema } from '../clinical/schemas/video-session.schema';
import { Invitation, InvitationSchema } from '../invitation/schemas/invitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: PatientCaregiver.name, schema: PatientCaregiverSchema },

      { name: User.name, schema: UserSchema },
      { name: Therapist.name, schema: TherapistSchema },
      { name: Caregiver.name, schema: CaregiverSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: TherapyGoal.name, schema: TherapyGoalSchema },
      { name: VideoSession.name, schema: VideoSessionSchema },
      { name: Invitation.name, schema: InvitationSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
