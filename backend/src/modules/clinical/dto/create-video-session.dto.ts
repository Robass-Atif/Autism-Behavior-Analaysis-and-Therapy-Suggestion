import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVideoSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  caregiverId?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  recordedAt: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  actionType?: string;

  @ApiProperty({ enum: ['high', 'medium', 'low'], required: false })
  @IsEnum(['high', 'medium', 'low'])
  @IsOptional()
  qualityScore?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  therapistNotes?: string;
}
