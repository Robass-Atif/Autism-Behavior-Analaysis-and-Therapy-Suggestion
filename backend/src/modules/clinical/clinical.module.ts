import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicalController } from './clinical.controller';
import { ClinicalService } from './clinical.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { TherapyGoal, TherapyGoalSchema } from './schemas/therapy-goal.schema';
import { VideoSession, VideoSessionSchema } from './schemas/video-session.schema';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TherapyGoal.name, schema: TherapyGoalSchema },
      { name: VideoSession.name, schema: VideoSessionSchema },
    ]),
    forwardRef(() => PatientsModule),
  ],
  controllers: [ClinicalController],
  providers: [ClinicalService, PdfGeneratorService],
  exports: [ClinicalService],
})
export class ClinicalModule { }
