import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ required: true, unique: true, uppercase: true })
  invitationCode: string;

  @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
  therapistId: Types.ObjectId;

  @Prop({ required: true })
  therapistName: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true })
  patientName: string;

  @Prop({ required: true, lowercase: true })
  caregiverEmail: string;

  @Prop()
  caregiverName?: string;

  @Prop({
    type: String,
    enum: Object.values(InvitationStatus),
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Caregiver' })
  acceptedBy?: Types.ObjectId;

  // Legacy fields for backward compatibility
  @Prop({ required: true, unique: true })
  code: string;

  @Prop()
  recipientEmail?: string;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Caregiver' })
  usedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Index for expiration and code lookup
InvitationSchema.index({ expiresAt: 1 });
InvitationSchema.index({ therapistId: 1 });
