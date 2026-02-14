import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WorkingHoursDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  start: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @IsNotEmpty()
  end: string;
}

export class CompleteOnboardingDto {
  @ApiProperty({
    description: 'Clinic name',
    example: 'NeuroCare Therapy Center',
  })
  @IsString()
  @IsNotEmpty()
  clinicName: string;

  @ApiProperty({
    description: 'Clinic address',
    example: '123 Main St, NY 10001',
  })
  @IsString()
  @IsNotEmpty()
  clinicAddress: string;

  @ApiProperty({
    description: 'Array of specialties',
    example: ['ABA', 'Speech Therapy'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  specialties: string[];

  @ApiProperty({
    description: 'Working hours',
    type: WorkingHoursDto,
  })
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours: WorkingHoursDto;

  @ApiProperty({
    description: 'Consultation fee (optional)',
    example: 150,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  consultationFee?: number;
}
