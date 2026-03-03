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
import { PatientsModule } from "../patients/patients.module";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TherapyGoal.name, schema: TherapyGoalSchema },
      { name: VideoSession.name, schema: VideoSessionSchema },
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
