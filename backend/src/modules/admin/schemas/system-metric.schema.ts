import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemMetricDocument = SystemMetric & Document;

@Schema({ timestamps: true })
export class SystemMetric {
    @Prop({ required: true })
    cpuUsage: number;

    @Prop({ required: true })
    memoryUsage: number;

    @Prop({ required: true })
    activeUsers: number;

    @Prop({ required: true })
    apiLatency: number;

    @Prop({ required: true, default: Date.now })
    timestamp: Date;
}

export const SystemMetricSchema = SchemaFactory.createForClass(SystemMetric);
