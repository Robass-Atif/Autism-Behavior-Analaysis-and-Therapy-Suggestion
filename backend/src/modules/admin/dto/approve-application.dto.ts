import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveApplicationDto {
  @ApiProperty({
    description: 'Optional notes about the approval decision',
    example: 'Credentials verified. License valid.',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
