import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteTherapistDto {
  @ApiProperty({
    description: 'Confirmation string - must be exactly "DELETE"',
    example: 'DELETE',
  })
  @IsString()
  @IsNotEmpty({ message: 'Confirmation is required' })
  @Matches(/^DELETE$/, { message: 'Confirmation must be exactly "DELETE"' })
  confirmation: string;

  @ApiProperty({
    description: 'Reason for permanent deletion',
    example: 'Account closure requested by user',
  })
  @IsString()
  @IsNotEmpty({ message: 'Deletion reason is required' })
  reason: string;
}
