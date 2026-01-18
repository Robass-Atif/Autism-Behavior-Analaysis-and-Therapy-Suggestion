import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Nested schemas for complex objects
@Schema({ _id: false })
export class Address {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  zipCode?: string;

  @Prop({ default: 'USA' })
  country?: string;
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  relationship: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  alternatePhone?: string;

  @Prop()
  email?: string;
}

@Schema({ _id: false })
export class CommunicationPreferences {
  @Prop({ default: true })
  emailUpdates: boolean;

  @Prop({ default: true })
  smsReminders: boolean;

  @Prop({ default: false })
  callReminders: boolean;
}

@Schema({ timestamps: true })
export class Patient extends Document {
  // ===== BASIC INFORMATION =====
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  mrn: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  therapistId: Types.ObjectId;

  // ===== CONTACT INFORMATION =====
  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ type: Address })
  address?: Address;

  @Prop()
  preferredLanguage?: string;

  @Prop({ type: CommunicationPreferences })
  communicationPreferences?: CommunicationPreferences;

  // ===== EMERGENCY CONTACT =====
  @Prop({ type: EmergencyContact })
  emergencyContact?: EmergencyContact;

  // ===== MEDICAL INFORMATION =====
  @Prop()
  diagnosisDate?: Date;

  @Prop()
  asdSeverity?: string;

  @Prop()
  diagnosisDetails?: string;

  @Prop()
  primaryPhysician?: string;

  @Prop({ type: [String], default: [] })
  coOccurringConditions?: string[];

  @Prop({ type: [String], default: [] })
  allergies?: string[];

  @Prop({ type: [String], default: [] })
  currentMedications?: string[];

  @Prop()
  specialNeeds?: string;

  @Prop({ type: [String], default: [] })
  previousTherapies?: string[];

  // ===== INSURANCE INFORMATION =====
  @Prop()
  insuranceProvider?: string;

  @Prop()
  insurancePolicyNumber?: string;

  @Prop()
  insuranceGroupNumber?: string;

  // ===== CLINICAL DETAILS =====
  @Prop()
  referralSource?: string;

  @Prop()
  admissionDate?: Date;

  @Prop()
  dischargeDate?: Date;

  @Prop()
  dischargeReason?: string;

  @Prop()
  clinicalNotes?: string;

  @Prop()
  caregiverNotes?: string;

  // ===== SYSTEM FIELDS =====
  @Prop({ default: 'active', enum: ['active', 'inactive', 'discharged'] })
  status: string;

  @Prop()
  progressScore?: number;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// Indexes
PatientSchema.index({ therapistId: 1 });
PatientSchema.index({ mrn: 1 });
PatientSchema.index({ status: 1 });
