import { Module, forwardRef } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from "@nestjs/mongoose";
import { ClinicalController } from "./clinical.controller";
import { ClinicalService } from "./clinical.service";
import { PdfGeneratorService } from "./services/pdf-generator.service";
import {
  TherapyGoal,
  TherapyGoalSchema,
} from "../therapy-goals/schemas/therapy-goal.schema";

import {
  VideoSession,
  VideoSessionSchema,
} from "./schemas/video-session.schema";
import { Patient, PatientSchema } from "../patients/schemas/patient.schema";
import { PatientCaregiver, PatientCaregiverSchema } from "../patients/schemas/patient-caregiver.schema";
import { PatientsModule } from "../patients/patients.module";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { EmailModule } from "../email/email.module";
import { User, UserSchema } from "../users/schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TherapyGoal.name, schema: TherapyGoalSchema },
      { name: VideoSession.name, schema: VideoSessionSchema },
      { name: Patient.name, schema: PatientSchema },
      { name: User.name, schema: UserSchema },
      { name: PatientCaregiver.name, schema: PatientCaregiverSchema },
    ]),
    forwardRef(() => PatientsModule),
    EmailModule,
    HttpModule,
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, PdfGeneratorService, AiAnalysisService],
  exports: [ClinicalService],
})
export class ClinicalModule {}
