import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectApplicationDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'License verification failed',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  reason: string;

  @ApiProperty({
    description: 'Additional notes about the rejection',
    example: 'License number does not match state records',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
