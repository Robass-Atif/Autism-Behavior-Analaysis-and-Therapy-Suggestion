import { IsEmail, IsOptional, IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Patient ID to link the caregiver to',
    example: '507f1f77bcf86cd799439011'
  })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({
    description: 'Caregiver email address',
    example: 'parent@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  caregiverEmail: string;

  @ApiPropertyOptional({
    description: 'Caregiver name (optional)',
    example: 'Jane Smith'
  })
  @IsString()
  @IsOptional()
  caregiverName?: string;

  @ApiPropertyOptional({
    description: 'Number of days until invitation expires (default: 7)',
    example: 7,
    default: 7
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  expiresInDays?: number;

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ description: 'Therapist name for the invitation' })
  @IsString()
  @IsOptional()
  therapistName?: string;

  @ApiPropertyOptional({ description: 'Email to send invitation to (legacy)' })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;
}
