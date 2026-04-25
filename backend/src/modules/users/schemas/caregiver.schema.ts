import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import { User } from "./user.schema";
import { RelationshipType, Language } from "../../../common/enums/role.enum";

export type CaregiverDocument = Caregiver & Document;

@Schema()
export class EmergencyContact {
  @Prop()
  name?: string;

  @Prop()
  phone?: string;

  @Prop()
  relationship?: string;
}

@Schema()
export class NotificationPreferences {
  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: false })
  smsNotifications: boolean;

  @Prop({ default: true })
  recordingReminders: boolean;
}

@Schema({ _id: false })
export class ConsentDecisionRecord {
  @Prop({ type: String, enum: ["GRANTED", "REVOKED"], required: true })
  decision: "GRANTED" | "REVOKED";

  @Prop({ required: true })
  timestamp: Date;
}

@Schema({ timestamps: true })
export class Caregiver extends User {
  @Prop({ type: String, enum: Language, default: Language.ENGLISH })
  preferredLanguage: Language;

  @Prop()
  otherLanguage?: string;

  @Prop({ type: String, enum: RelationshipType, required: true })
  relationshipType: RelationshipType;

  @Prop()
  otherRelationshipType?: string;

  @Prop()
  invitationCode?: string;

  @Prop({ type: Types.ObjectId, ref: "Therapist" })
  invitedBy?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Patient" }] })
  assignedPatients?: Types.ObjectId[];

  @Prop({ type: EmergencyContact })
  emergencyContact?: EmergencyContact;

  @Prop({ type: NotificationPreferences, default: {} })
  notificationPreferences: NotificationPreferences;

  @Prop({ default: false })
  termsAccepted: boolean;

  @Prop({ default: false })
  privacyPolicyAccepted: boolean;

  @Prop({ default: false })
  videoRecordingConsentAccepted: boolean;

  @Prop({ type: [ConsentDecisionRecord], default: [] })
  consentDecisionHistory: ConsentDecisionRecord[];
}

export const CaregiverSchema = SchemaFactory.createForClass(Caregiver);

// Hash password before saving
CaregiverSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
CaregiverSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
