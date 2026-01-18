import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Nested DTOs
export class AddressDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ required: false, default: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class EmergencyContactDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CommunicationPreferencesDto {
  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  emailUpdates?: boolean;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  smsReminders?: boolean;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  callReminders?: boolean;
}

export class CreatePatientDto {
  // ===== BASIC INFORMATION (Required) =====
  @ApiProperty({
    description: 'Medical Record Number (must be unique)',
    example: 'MRN-123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'MRN is required' })
  mrn: string;

  @ApiProperty({
    description: "Patient's full name",
    example: 'Emma Johnson',
  })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiProperty({
    description: 'Date of birth (ISO 8601 format)',
    example: '2018-05-12',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Date of birth is required' })
  dob: string;

  @ApiProperty({
    description: 'Gender',
    example: 'female',
    enum: ['male', 'female', 'other'],
  })
  @IsEnum(['male', 'female', 'other'], { message: 'Invalid gender value' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender: string;

  // ===== CONTACT INFORMATION (Optional) =====
  @ApiProperty({ required: false, description: 'Patient or parent email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({ required: false, example: 'English' })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiProperty({ required: false, type: CommunicationPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommunicationPreferencesDto)
  communicationPreferences?: CommunicationPreferencesDto;

  // ===== EMERGENCY CONTACT (Optional) =====
  @ApiProperty({ required: false, type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  // ===== MEDICAL INFORMATION (Optional) =====
  @ApiProperty({
    description: 'Date of ASD diagnosis',
    example: '2020-03-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  diagnosisDate?: string;

  @ApiProperty({
    description: 'ASD severity level',
    example: 'Level 2',
    required: false,
  })
  @IsString()
  @IsOptional()
  asdSeverity?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  diagnosisDetails?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryPhysician?: string;

  @ApiProperty({ required: false, type: [String], example: ['ADHD', 'Anxiety'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coOccurringConditions?: string[];

  @ApiProperty({ required: false, type: [String], example: ['Peanuts', 'Dairy'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentMedications?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @ApiProperty({ required: false, type: [String], example: ['ABA', 'Speech Therapy'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousTherapies?: string[];

  // ===== INSURANCE INFORMATION (Optional) =====
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  insuranceGroupNumber?: string;

  // ===== CLINICAL DETAILS (Optional) =====
  @ApiProperty({ required: false, example: 'Pediatrician referral' })
  @IsOptional()
  @IsString()
  referralSource?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  caregiverNotes?: string;
}

