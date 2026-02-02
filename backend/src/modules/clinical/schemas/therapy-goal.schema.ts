import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TherapyGoal extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  therapistId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    enum: ['active', 'completed', 'achieved', 'on hold', 'archived', 'discontinued'],
    default: 'active',
  })
  status: string;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date, required: true })
  targetDate: Date;

  @Prop({ enum: ['high', 'medium', 'low'], default: 'medium' })
  priority: string;

  @Prop({ type: [String], default: [] })
  interventions: string[];

  @Prop({ type: String })
  notes: string;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const TherapyGoalSchema = SchemaFactory.createForClass(TherapyGoal);
