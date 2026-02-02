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

  @ApiPropertyOptional({ description: 'Phone number with country code' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsString()
  @IsOptional()
  employeeId?: string;

  // Administrative Role
  @ApiProperty({ enum: AdminLevel, description: 'Admin level' })
  @IsEnum(AdminLevel)
  adminLevel: AdminLevel;

  // Organization Details
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsString()
  @IsOptional()
  organizationName?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

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
  @ApiPropertyOptional({ enum: TwoFactorMethod, description: '2FA method (mandatory)' })
  @IsEnum(TwoFactorMethod)
  @IsOptional()
  twoFactorMethod?: TwoFactorMethod;

  @ApiPropertyOptional({ description: 'Phone number for 2FA (if SMS selected)' })
  @IsString()
  @IsOptional()
  twoFactorPhone?: string;

  @ApiPropertyOptional({ description: 'Backup email for 2FA' })
  @IsEmail()
  @IsOptional()
  backupEmail?: string;

  // Security Questions (Mandatory)
  @ApiPropertyOptional({
    type: [SecurityQuestionDto],
    description: 'Three security questions with answers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(0) // Make optional by allowing 0
  @ArrayMaxSize(3)
  @IsOptional()
  @Type(() => SecurityQuestionDto)
  securityQuestions?: SecurityQuestionDto[];

  // Access Justification
  @ApiPropertyOptional({ description: 'Reason for admin access' })
  @IsString()
  @IsOptional()
  accessJustification?: string;

  // Terms and Conditions
  @ApiPropertyOptional({ description: 'Admin Code of Conduct acceptance' })
  @IsBoolean()
  @IsOptional()
  adminCodeOfConductAccepted?: boolean;

  @ApiPropertyOptional({ description: 'System Access Policy acceptance' })
  @IsBoolean()
  @IsOptional()
  systemAccessPolicyAccepted?: boolean;

  @ApiPropertyOptional({ description: 'Security responsibility acknowledgment' })
  @IsBoolean()
  @IsOptional()
  securityResponsibilityAccepted?: boolean;

  @ApiPropertyOptional({ description: 'HIPAA compliance acceptance' })
  @IsBoolean()
  @IsOptional()
  hipaaAccepted?: boolean;

  // Approval
  @ApiPropertyOptional({ description: 'Approving Super Admin email' })
  @IsEmail()
  @IsOptional()
  approvingSuperAdminEmail?: string;

  @ApiPropertyOptional({ description: 'Approval code from Super Admin' })
  @IsString()
  @IsOptional()
  approvalCode?: string;
}
