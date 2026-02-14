import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TherapyGoalsService } from './therapy-goals.service';
import { TherapyGoalsController } from './therapy-goals.controller';
import { TherapyGoal, TherapyGoalSchema } from './schemas/therapy-goal.schema';
import { PatientsModule } from '../patients/patients.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: TherapyGoal.name, schema: TherapyGoalSchema },
        ]),
        PatientsModule,
    ],
    controllers: [TherapyGoalsController],
    providers: [TherapyGoalsService],
    exports: [TherapyGoalsService],
})
export class TherapyGoalsModule { }
