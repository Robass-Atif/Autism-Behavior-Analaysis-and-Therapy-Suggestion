import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PatientCaregiver extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Caregiver', required: true })
  caregiverId: Types.ObjectId;

  @Prop({ default: 'active', enum: ['active', 'revoked'] })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PatientCaregiverSchema =
  SchemaFactory.createForClass(PatientCaregiver);

// Add unique compound index to prevent duplicate links
PatientCaregiverSchema.index(
  { patientId: 1, caregiverId: 1 },
  { unique: true },
);
