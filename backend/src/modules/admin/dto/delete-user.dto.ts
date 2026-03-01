import { IsString, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DeleteUserDto {
  @ApiProperty({
    description: "Reason for soft deleting the user",
    example: "Account violation or user request",
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
