import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { PredictController } from './predict.controller';
import { PredictService } from './predict.service';
import { Prediction, PredictionSchema } from './schemas/prediction.schema';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        HttpModule,
        MongooseModule.forFeature([{ name: Prediction.name, schema: PredictionSchema }]),
        UsersModule,
    ],
    controllers: [PredictController],
    providers: [PredictService],
})
export class PredictModule { }
