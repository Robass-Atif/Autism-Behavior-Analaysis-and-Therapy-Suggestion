import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({ example: "OldPassword@123" })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: "NewPassword@123" })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ example: "NewPassword@123" })
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}
