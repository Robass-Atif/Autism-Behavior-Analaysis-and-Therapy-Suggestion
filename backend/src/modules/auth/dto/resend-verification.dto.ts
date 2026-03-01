import { IsEmail, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResendVerificationDto {
  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
