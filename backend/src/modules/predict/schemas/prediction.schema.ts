import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Prediction extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String })
    patientId: string;

    @Prop({ required: true })
    videoPath: string;

    @Prop({ type: Object })
    predictionResult: any;

    @Prop({ default: 'pending' })
    status: string;

    @Prop()
    filename: string;

    @Prop()
    mimetype: string;
}

export const PredictionSchema = SchemaFactory.createForClass(Prediction);
