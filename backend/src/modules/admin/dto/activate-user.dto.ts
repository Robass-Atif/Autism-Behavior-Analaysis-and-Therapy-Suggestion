import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateUserDto {
  @ApiProperty({
    description: 'Optional notes about the reactivation',
    example: 'User appealed successfully. Reinstating access.',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
