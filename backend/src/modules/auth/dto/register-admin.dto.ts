import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateNested,
  Matches,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminLevel, TwoFactorMethod } from '../../../common/enums/role.enum';

class SecurityQuestionDto {
  @ApiProperty({ description: 'Security question' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'Answer to security question' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}

export class RegisterAdminDto {
  // Personal Information
  @ApiProperty({ description: 'Full name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ description: 'Email address (must be organizational email)' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Phone number with country code' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Employee ID' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  // Administrative Role
  @ApiProperty({ enum: AdminLevel, description: 'Admin level' })
  @IsEnum(AdminLevel)
  adminLevel: AdminLevel;

  // Organization Details
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({ description: 'Department' })
  @IsString()
  @IsNotEmpty()
  department: string;

  // Account Security
  @ApiProperty({
    description: 'Password (min 12 chars for admin, stricter requirements)',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
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

  // Two-Factor Authentication (Mandatory for Admin)
  @ApiProperty({ enum: TwoFactorMethod, description: '2FA method (mandatory)' })
  @IsEnum(TwoFactorMethod)
  twoFactorMethod: TwoFactorMethod;

  @ApiPropertyOptional({ description: 'Phone number for 2FA (if SMS selected)' })
  @IsString()
  @IsOptional()
  twoFactorPhone?: string;

  @ApiPropertyOptional({ description: 'Backup email for 2FA' })
  @IsEmail()
  @IsOptional()
  backupEmail?: string;

  // Security Questions (Mandatory)
  @ApiProperty({
    type: [SecurityQuestionDto],
    description: 'Three security questions with answers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @Type(() => SecurityQuestionDto)
  securityQuestions: SecurityQuestionDto[];

  // Access Justification
  @ApiProperty({ description: 'Reason for admin access' })
  @IsString()
  @IsNotEmpty()
  accessJustification: string;

  // Terms and Conditions
  @ApiProperty({ description: 'Admin Code of Conduct acceptance' })
  @IsBoolean()
  adminCodeOfConductAccepted: boolean;

  @ApiProperty({ description: 'System Access Policy acceptance' })
  @IsBoolean()
  systemAccessPolicyAccepted: boolean;

  @ApiProperty({ description: 'Security responsibility acknowledgment' })
  @IsBoolean()
  securityResponsibilityAccepted: boolean;

  @ApiProperty({ description: 'HIPAA compliance acceptance' })
  @IsBoolean()
  hipaaAccepted: boolean;

  // Approval
  @ApiProperty({ description: 'Approving Super Admin email' })
  @IsEmail()
  @IsNotEmpty()
  approvingSuperAdminEmail: string;

  @ApiProperty({ description: 'Approval code from Super Admin' })
  @IsString()
  @IsNotEmpty()
  approvalCode: string;
}
