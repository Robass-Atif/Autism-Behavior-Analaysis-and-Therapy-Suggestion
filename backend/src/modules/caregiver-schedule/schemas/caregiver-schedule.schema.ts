import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CaregiverScheduleDocument = CaregiverSchedule & Document;

@Schema({ timestamps: true })
export class CaregiverSchedule {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  caregiverId: Types.ObjectId;

  @Prop({ type: String })
  caregiverName: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true })
  patientName: string;

  @Prop({ required: true })
  actionType: string;

  /** ISO date string — the day this session is scheduled */
  @Prop({ type: Date, required: true })
  scheduledDate: Date;

  /** Optional time slot, e.g. "10:00" */
  @Prop({ type: String })
  timeSlot: string;

  @Prop({ type: String })
  notes: string;

  @Prop({
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const CaregiverScheduleSchema = SchemaFactory.createForClass(CaregiverSchedule);
