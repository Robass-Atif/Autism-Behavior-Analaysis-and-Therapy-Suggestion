import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({
    description: 'Reason for suspension',
    example: 'Terms of service violation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Suspension reason is required' })
  reason: string;

  @ApiProperty({
    description: 'Additional notes about the suspension',
    example: 'Multiple complaints received from caregivers',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
