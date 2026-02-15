import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Dashboard')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('therapist/dashboard/stats')
  @Roles(Role.THERAPIST)
  @ApiOperation({ summary: 'Get therapist dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getTherapistDashboardStats(@CurrentUser() user: any) {
    return this.dashboardService.getTherapistStats(user.sub);
  }

  @Get('caregiver/dashboard/stats')
  @Roles(Role.CAREGIVER)
  @ApiOperation({ summary: 'Get caregiver dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getCaregiverDashboardStats(@CurrentUser() user: any) {
    return this.dashboardService.getCaregiverStats(user.sub);
  }

  @Get('admin/dashboard/stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved' })
  async getAdminDashboardStats() {
    return this.dashboardService.getAdminStats();
  }
}
