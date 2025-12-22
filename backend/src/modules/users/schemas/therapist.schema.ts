import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from './user.schema';
import { TherapistTitle, LicenseType } from '../../../common/enums/role.enum';

export type TherapistDocument = Therapist & Document;

@Schema()
export class ProfessionalReference {
  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;
}

@Schema()
export class OrganizationDetails {
  @Prop({ required: true })
  organizationName: string;

  @Prop()
  department?: string;

  @Prop({ required: true })
  workAddress: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  stateProvince: string;

  @Prop({ required: true })
  zipPostalCode: string;

  @Prop({ required: true })
  country: string;
}

@Schema()
export class ProfessionalCredentials {
  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ type: String, enum: LicenseType, required: true })
  licenseType: LicenseType;

  @Prop()
  otherLicenseType?: string;

  @Prop({ required: true })
  issuingAuthority: string;

  @Prop({ required: true })
  licenseExpiryDate: Date;

  @Prop()
  licenseCertificatePath?: string;

  @Prop({ default: false })
  isLicenseVerified: boolean;
}

@Schema({ timestamps: true })
export class Therapist extends User {
  @Prop({ type: String, enum: TherapistTitle, required: true })
  professionalTitle: TherapistTitle;

  @Prop()
  otherProfessionalTitle?: string;

  @Prop({ type: ProfessionalCredentials, required: true })
  credentials: ProfessionalCredentials;

  @Prop({ type: OrganizationDetails, required: true })
  organization: OrganizationDetails;

  @Prop({ type: [ProfessionalReference] })
  references?: ProfessionalReference[];

  @Prop({ default: false })
  termsAccepted: boolean;

  @Prop({ default: false })
  hipaaAccepted: boolean;

  @Prop({ default: false })
  privacyPolicyAccepted: boolean;

  @Prop()
  digitalSignaturePath?: string;

  @Prop({ default: false })
  isAdminApproved: boolean;

  @Prop()
  adminApprovalDate?: Date;

  @Prop()
  adminApprovalBy?: string;

  @Prop()
  rejectionReason?: string;
}

export const TherapistSchema = SchemaFactory.createForClass(Therapist);
