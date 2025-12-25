import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from './user.schema';
import { AdminLevel, TwoFactorMethod } from '../../../common/enums/role.enum';

export type AdminDocument = Admin & Document;

@Schema()
export class SecurityQuestion {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;
}

@Schema({ timestamps: true })
export class Admin extends User {
  @Prop({ required: true })
  employeeId: string;

  @Prop({ type: String, enum: AdminLevel, required: true })
  adminLevel: AdminLevel;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  organizationName: string;

  @Prop({ type: String, enum: TwoFactorMethod, required: true })
  twoFactorMethod: TwoFactorMethod;

  @Prop()
  backupEmail?: string;

  @Prop({ type: [SecurityQuestion], required: true })
  securityQuestions: SecurityQuestion[];

  @Prop()
  accessJustification: string;

  @Prop()
  approvalCode?: string;

  @Prop({ type: Types.ObjectId, ref: 'Admin' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvalDate?: Date;

  @Prop({ default: false })
  adminCodeOfConductAccepted: boolean;

  @Prop({ default: false })
  systemAccessPolicyAccepted: boolean;

  @Prop({ default: false })
  securityResponsibilityAccepted: boolean;

  @Prop({ default: false })
  hipaaAccepted: boolean;

  @Prop({ default: false })
  isApproved: boolean;

  @Prop({ default: false })
  isTwoFactorSetupComplete: boolean;

  @Prop({ type: [String], default: [] })
  permissions: string[];
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
AdminSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
