import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, ref: 'Therapist', required: true })
  therapistId: Types.ObjectId;

  @Prop({ required: true })
  therapistName: string;

  @Prop()
  recipientEmail?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Caregiver' })
  usedBy?: Types.ObjectId;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Index for expiration and code lookup
InvitationSchema.index({ code: 1 });
InvitationSchema.index({ expiresAt: 1 });
InvitationSchema.index({ therapistId: 1 });
