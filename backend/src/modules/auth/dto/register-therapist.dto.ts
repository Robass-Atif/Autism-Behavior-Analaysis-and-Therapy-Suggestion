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

export class ProfessionalReferenceDto {
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

export class ProfessionalCredentialsDto {
  @ApiProperty({ description: 'License Number' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;

  @ApiProperty({ enum: LicenseType, description: 'License Type' })
  @IsEnum(LicenseType)
  licenseType: LicenseType;

  @ApiPropertyOptional({ description: 'Other License Type' })
  @IsString()
  @IsOptional()
  otherLicenseType?: string;

  @ApiProperty({ description: 'Issuing Authority' })
  @IsString()
  @IsNotEmpty()
  issuingAuthority: string;

  @ApiProperty({ description: 'License Expiry Date' })
  @IsDateString()
  @IsNotEmpty()
  licenseExpiryDate: string;
}

// Flattened DTO to match FormData structure
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

  @ApiPropertyOptional({ enum: ['M', 'F', 'Other'], description: 'Gender' })
  @IsEnum(['M', 'F', 'Other'])
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  // Professional Credentials
  @ApiProperty({ type: ProfessionalCredentialsDto })
  @ValidateNested()
  @Type(() => ProfessionalCredentialsDto)
  credentials: ProfessionalCredentialsDto;

  // Organization/Practice (Flattened)
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

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State or Province' })
  @IsString()
  @IsOptional()
  stateProvince?: string;

  @ApiPropertyOptional({ description: 'Zip or Postal code' })
  @IsString()
  @IsOptional()
  zipPostalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

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
  // Kept as array/nested if frontend sends JSON, otherwise might need flattening too or custom parsing
  // For now assuming references are NOT sent in the initial registration form based on frontend code
  @ApiPropertyOptional({ type: [ProfessionalReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalReferenceDto)
  @IsOptional()
  references?: ProfessionalReferenceDto[];

  // Terms and Conditions
  @ApiProperty({ description: 'Terms of Service acceptance' })
  @IsOptional() // Use IsOptional + Transform if coming as string "true"/"false" via FormData
  termsAccepted: boolean;

  @ApiProperty({ description: 'HIPAA compliance acceptance' })
  @IsOptional()
  hipaaAccepted: boolean;

  @ApiProperty({ description: 'Privacy Policy acceptance' })
  @IsOptional()
  privacyPolicyAccepted: boolean;

  // Two-Factor Authentication (optional)
  @ApiPropertyOptional({ description: 'Enable Two-Factor Authentication' })
  @IsOptional()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional({ enum: TwoFactorMethod, description: '2FA method' })
  @IsEnum(TwoFactorMethod)
  @IsOptional()
  twoFactorMethod?: TwoFactorMethod;
}
