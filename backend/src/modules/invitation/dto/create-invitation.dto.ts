import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Therapist name for the invitation' })
  @IsString()
  @IsNotEmpty()
  therapistName: string;

  @ApiPropertyOptional({ description: 'Email to send invitation to' })
  @IsEmail()
  @IsOptional()
  recipientEmail?: string;
}
