import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { PredictController } from './predict.controller';
import { PredictService } from './predict.service';
import { Prediction, PredictionSchema } from './schemas/prediction.schema';
import { VideoSession, VideoSessionSchema } from '../clinical/schemas/video-session.schema';
import { UsersModule } from '../users/users.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
    imports: [
        HttpModule,
        MongooseModule.forFeature([
            { name: Prediction.name, schema: PredictionSchema },
            { name: VideoSession.name, schema: VideoSessionSchema },
        ]),
        UsersModule,
        PatientsModule,
    ],
    controllers: [PredictController],
    providers: [PredictService],
})
export class PredictModule { }
