import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  ValidateNested,
  Matches,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TherapistTitle, LicenseType, TwoFactorMethod } from '../../../common/enums/role.enum';

class ProfessionalReferenceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;
}

class OrganizationDetailsDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiPropertyOptional({ description: 'Department or specialty' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ description: 'Work address' })
  @IsString()
  @IsNotEmpty()
  workAddress: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State or Province' })
  @IsString()
  @IsNotEmpty()
  stateProvince: string;

  @ApiProperty({ description: 'Zip or Postal code' })
  @IsString()
  @IsNotEmpty()
  zipPostalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;
}

class ProfessionalCredentialsDto {
  @ApiProperty({ description: 'License number' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ enum: LicenseType, description: 'Type of license' })
  @IsEnum(LicenseType)
  licenseType: LicenseType;

  @ApiPropertyOptional({ description: 'Other license type if selected Other' })
  @IsString()
  @IsOptional()
  otherLicenseType?: string;

  @ApiProperty({ description: 'Issuing authority' })
  @IsString()
  @IsNotEmpty()
  issuingAuthority: string;

  @ApiProperty({ description: 'License expiry date' })
  @IsDateString()
  licenseExpiryDate: string;
}

export class RegisterTherapistDto {
  // Personal Information
  @ApiProperty({ description: 'Full name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ enum: TherapistTitle, description: 'Professional title' })
  @IsEnum(TherapistTitle)
  professionalTitle: TherapistTitle;

  @ApiPropertyOptional({ description: 'Other professional title' })
  @IsString()
  @IsOptional()
  otherProfessionalTitle?: string;

  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  // Professional Credentials
  @ApiProperty({ type: ProfessionalCredentialsDto })
  @ValidateNested()
  @Type(() => ProfessionalCredentialsDto)
  credentials: ProfessionalCredentialsDto;

  // Organization/Practice
  @ApiProperty({ type: OrganizationDetailsDto })
  @ValidateNested()
  @Type(() => OrganizationDetailsDto)
  organization: OrganizationDetailsDto;

  // Account Security
  @ApiProperty({
    description: 'Password (min 8 chars, must include uppercase, lowercase, number, special char)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least one uppercase, one lowercase, one number, and one special character',
    },
  )
  password: string;

  @ApiProperty({ description: 'Confirm password' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  // Professional References (optional)
  @ApiPropertyOptional({ type: [ProfessionalReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalReferenceDto)
  @IsOptional()
  references?: ProfessionalReferenceDto[];

  // Terms and Conditions
  @ApiProperty({ description: 'Terms of Service acceptance' })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({ description: 'HIPAA compliance acceptance' })
  @IsBoolean()
  hipaaAccepted: boolean;

  @ApiProperty({ description: 'Privacy Policy acceptance' })
  @IsBoolean()
  privacyPolicyAccepted: boolean;

  // Two-Factor Authentication (optional)
  @ApiPropertyOptional({ description: 'Enable Two-Factor Authentication' })
  @IsBoolean()
  @IsOptional()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ enum: TwoFactorMethod, description: '2FA method' })
  @IsEnum(TwoFactorMethod)
  @IsOptional()
  twoFactorMethod?: TwoFactorMethod;
}
