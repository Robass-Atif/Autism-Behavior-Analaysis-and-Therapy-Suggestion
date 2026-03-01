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
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RelationshipType, Language } from "../../../common/enums/role.enum";

class EmergencyContactDto {
  @ApiPropertyOptional({ description: "Emergency contact name" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Emergency contact phone" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: "Relationship to emergency contact" })
  @IsString()
  @IsOptional()
  relationship?: string;
}

class NotificationPreferencesDto {
  @ApiPropertyOptional({ description: "Receive email notifications" })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: "Receive SMS notifications" })
  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ description: "Receive recording reminders" })
  @IsBoolean()
  @IsOptional()
  recordingReminders?: boolean;
}

export class RegisterCaregiverDto {
  // Personal Information
  @ApiProperty({ description: "Full name", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Phone number with country code" })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ description: "Date of birth for age verification" })
  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ["M", "F", "Other"], description: "Gender" })
  @IsEnum(["M", "F", "Other"])
  @IsOptional()
  gender?: string;

  @ApiProperty({ enum: Language, description: "Preferred language" })
  @IsEnum(Language)
  preferredLanguage: Language;

  @ApiPropertyOptional({ description: "Other language if selected Other" })
  @IsString()
  @IsOptional()
  otherLanguage?: string;

  // Relationship to Patient
  @ApiProperty({ enum: RelationshipType, description: "Relationship type" })
  @IsEnum(RelationshipType)
  relationshipType: RelationshipType;

  @ApiPropertyOptional({ description: "Other relationship type" })
  @IsString()
  @IsOptional()
  otherRelationshipType?: string;

  // Account Security
  @ApiProperty({
    description:
      "Password (min 8 chars, must include uppercase, lowercase, number)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  @Matches(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  @Matches(/[0-9]/, { message: "Password must contain at least one number" })
  @Matches(/[@$!%*?&.]/, {
    message: "Password must contain at least one special character (@$!%*?&.)",
  })
  password: string;

  @ApiProperty({ description: "Confirm password" })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;

  // Invitation Code
  @ApiPropertyOptional({ description: "Therapist invitation code" })
  @IsString()
  @IsOptional()
  invitationCode?: string;

  // Emergency Contact
  @ApiPropertyOptional({ type: EmergencyContactDto })
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  @IsOptional()
  emergencyContact?: EmergencyContactDto;

  // Terms and Conditions
  @ApiProperty({ description: "Terms of Service acceptance" })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({ description: "Privacy Policy acceptance" })
  @IsBoolean()
  privacyPolicyAccepted: boolean;

  @ApiProperty({ description: "Video recording guidelines consent" })
  @IsBoolean()
  videoRecordingConsentAccepted: boolean;

  // Notification Preferences
  @ApiPropertyOptional({ type: NotificationPreferencesDto })
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  @IsOptional()
  notificationPreferences?: NotificationPreferencesDto;
}
