import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as bcrypt from "bcryptjs";
import { Role, AccountStatus } from "../../../common/enums/role.enum";

export type UserDocument = User & Document;

@Schema({ timestamps: true, discriminatorKey: "role" })
export class User {
  @Prop({ required: true, trim: true, maxlength: 100 })
  fullName: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  })
  email: string;

  @Prop({ required: true, minlength: 8, select: false })
  password: string;

  @Prop()
  phoneNumber?: string;

  @Prop({
    type: String,
    enum: Role,
    required: true,
  })
  role: Role;

  @Prop({
    type: String,
    enum: AccountStatus,
    default: AccountStatus.PENDING_VERIFICATION,
  })
  accountStatus: AccountStatus;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ enum: ["M", "F", "Other"] })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  lastLogin?: Date;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop()
  twoFactorMethod?: string;

  @Prop()
  twoFactorSecret?: string;

  // TASK 8: Rejection tracking for therapists (3-attempt limit)
  @Prop({ default: 0 })
  rejectionCount?: number;

  // Therapist onboarding completion flag
  @Prop({ default: false })
  onboardingCompleted?: boolean;

  // Therapist clinic information (populated after onboarding)
  @Prop()
  clinicName?: string;

  @Prop()
  clinicAddress?: string;

  @Prop({ type: [String] })
  specialties?: string[];

  @Prop({ type: Object })
  workingHours?: {
    start: string;
    end: string;
  };

  @Prop()
  consultationFee?: number;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  deletedAt?: Date;

  // Method to compare password
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
