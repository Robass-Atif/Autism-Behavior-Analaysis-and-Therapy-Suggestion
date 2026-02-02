import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateInvitationDto {
  @ApiProperty({
    description: 'Invitation code in format CG-XXXXXX',
    example: 'CG-A7B9C2',
    minLength: 9,
    maxLength: 9,
  })
  @IsString()
  @IsNotEmpty()
  @Length(9, 9, { message: 'Invitation code must be exactly 9 characters (CG-XXXXXX)' })
  @Matches(/^CG-[A-Z0-9]{6}$/i, {
    message: 'Invitation code must be in format CG-XXXXXX',
  })
  invitationCode: string;
}
