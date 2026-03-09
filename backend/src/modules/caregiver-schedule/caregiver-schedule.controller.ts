import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { CaregiverScheduleService } from "./caregiver-schedule.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "../../common/enums/role.enum";

@ApiTags("CaregiverSchedule")
@Controller("caregiver-schedule")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CaregiverScheduleController {
  constructor(private readonly svc: CaregiverScheduleService) {}

  /** Therapist creates a new schedule entry for a caregiver */
  @Post()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create caregiver schedule entry" })
  create(
    @CurrentUser() user: any,
    @Body()
    dto: {
      caregiverId: string;
      caregiverName?: string;
      patientId: string;
      patientName: string;
      actionType: string;
      scheduledDate: string;
      timeSlot?: string;
      notes?: string;
    },
  ) {
    return this.svc.create(user.sub, dto);
  }

  /**
   * Caregiver fetches their own schedule (unique per login).
   * Therapist can pass caregiverId to view a specific caregiver's schedule.
   */
  @Get()
  @Roles(Role.CAREGIVER, Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Get schedule entries (caregiver's own or therapist's view)",
  })
  @ApiQuery({ name: "month", required: false, description: "YYYY-MM" })
  @ApiQuery({ name: "caregiverId", required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query("month") month?: string,
    @Query("caregiverId") caregiverId?: string,
  ) {
    // Compare case-insensitively — JWT may store 'CAREGIVER' or 'caregiver'
    if (user.role?.toLowerCase() === Role.CAREGIVER) {
      return this.svc.findForCaregiver(user.sub, month);
    }
    return this.svc.findForTherapist(user.sub, caregiverId, month);
  }

  @Put(":id")
  @Roles(Role.CAREGIVER, Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Update a schedule entry" })
  update(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body()
    data: {
      status?: string;
      timeSlot?: string;
      notes?: string;
      actionType?: string;
      scheduledDate?: string;
    },
  ) {
    return this.svc.update(id, user.sub, user.role, data);
  }

  @Delete(":id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a schedule entry" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.svc.remove(id, user.sub);
  }
}
