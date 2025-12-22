import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase, one lowercase, and one number',
  })
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
