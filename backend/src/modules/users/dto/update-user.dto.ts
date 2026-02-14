import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEnum, IsOptional, IsBoolean, IsDate, IsNumber } from 'class-validator';
import { AccountStatus } from '../../../common/enums/role.enum';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsEnum(AccountStatus)
  @IsOptional()
  accountStatus?: AccountStatus;

  @IsBoolean()
  @IsOptional()
  deleted?: boolean;

  @IsDate()
  @IsOptional()
  deletedAt?: Date;

  @IsNumber()
  @IsOptional()
  rejectionCount?: number;
}
