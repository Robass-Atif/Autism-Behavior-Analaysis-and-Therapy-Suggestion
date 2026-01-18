import { PartialType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
    @ApiProperty({
        required: false,
        enum: ['Active', 'Inactive', 'Discharged'],
        description: 'Patient status',
    })
    @IsOptional()
    @IsEnum(['Active', 'Inactive', 'Discharged'])
    status?: string;

    @ApiProperty({ required: false, description: 'Discharge reason if status is Discharged' })
    @IsOptional()
    dischargeReason?: string;

    @ApiProperty({ required: false, description: 'Discharge date if status is Discharged' })
    @IsOptional()
    dischargeDate?: string;
}
