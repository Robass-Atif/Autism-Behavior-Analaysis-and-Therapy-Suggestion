import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTherapyGoalDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['active', 'achieved', 'on hold', 'discontinued'], required: false })
  @IsEnum(['active', 'achieved', 'on hold', 'discontinued'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiProperty({ enum: ['high', 'medium', 'low'], required: false })
  @IsEnum(['high', 'medium', 'low'])
  @IsOptional()
  priority?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
