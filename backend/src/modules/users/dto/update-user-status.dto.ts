import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '../../../common/enums/role.enum';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: AccountStatus, description: 'New account status' })
  @IsEnum(AccountStatus)
  @IsNotEmpty()
  status: AccountStatus;
}
