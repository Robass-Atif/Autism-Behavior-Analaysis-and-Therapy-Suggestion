import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VideoSession extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  caregiverId: Types.ObjectId;

  @Prop({ required: true })
  videoUrl: string;

  @Prop({ type: String })
  thumbnailUrl: string;

  @Prop({ type: Date, required: true })
  recordedAt: Date;

  @Prop({ type: Number, required: true }) // in seconds
  duration: number;

  @Prop({ type: String })
  actionType: string;

  @Prop({ enum: ['high', 'medium', 'low'], default: 'medium' })
  qualityScore: string;

  @Prop({
    enum: ['uploaded', 'processing', 'analyzed', 'reviewed', 'failed'],
    default: 'uploaded',
  })
  status: string;

  @Prop({ type: Number, min: 0, max: 100 })
  aiConfidence: number;

  @Prop({ type: Object })
  aiAnalysis: {
    behaviors: Array<{
      type: string;
      timestamp: number;
      confidence: number;
      severity: string;
    }>;
    summary: string;
    recommendations: string[];
  };

  @Prop({ type: String })
  therapistNotes: string;

  @Prop({ type: Boolean, default: false })
  reviewed: boolean;

  @Prop({ type: Date })
  reviewedAt: Date;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const VideoSessionSchema = SchemaFactory.createForClass(VideoSession);
