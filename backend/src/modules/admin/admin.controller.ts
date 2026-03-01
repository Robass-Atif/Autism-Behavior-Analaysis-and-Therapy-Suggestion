import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApproveApplicationDto } from "./dto/approve-application.dto";
import { RejectApplicationDto } from "./dto/reject-application.dto";
import { SuspendUserDto } from "./dto/suspend-user.dto";
import { ActivateUserDto } from "./dto/activate-user.dto";
import { DeleteTherapistDto } from "./dto/delete-therapist.dto";
import { DeleteUserDto } from "./dto/delete-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { Role } from "../../common/enums/role.enum";

@ApiTags("Admin Operations")
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard Stats - GET /admin/dashboard/stats
  @Get("dashboard/stats")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Get dashboard statistics",
    description:
      "Returns real-time dashboard statistics calculated from backend data",
  })
  @ApiResponse({ status: 200, description: "Dashboard stats retrieved" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Get User Growth Stats
  @Get("dashboard/growth")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get user growth statistics" })
  async getUserGrowthStats() {
    return this.adminService.getUserGrowthStats();
  }

  // 9️⃣ GET /admin/therapist-applications
  @Get("audit-logs")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get audit logs" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  async getAuditLogs(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }

  @Get("system-health")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get system health" })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get("therapist-applications")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "List all therapist applications",
    description: "Get all therapist applications with optional filtering",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["PENDING", "ACTIVE", "REJECTED"],
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Applications retrieved" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async getTherapistApplications(
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getTherapistApplications({
      status,
      page: page || 1,
      limit: limit || 20,
    });
  }

  // 🔟 GET /admin/users - Get all users (unified)
  @Get("users")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Get all users",
    description: "Get all users across all roles with filtering",
  })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["admin", "therapist", "caregiver"],
  })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Users retrieved" })
  async getAllUsers(
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getAllUsers({
      role,
      status,
      page: page || 1,
      limit: limit || 50,
    });
  }

  // 1️⃣1️⃣ GET /admin/users/:id - Get single user basic info
  @Get("users/:id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "id", description: "User ID" })
  async getUser(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  // 1️⃣2️⃣ GET /admin/users/:id/details - Get full user details with role-specific data
  @Get("users/:id/details")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get full user details" })
  @ApiParam({ name: "id", description: "User ID" })
  async getUserDetails(@Param("id") id: string) {
    return this.adminService.getUserDetails(id);
  }

  // 1️⃣3️⃣ PUT /admin/users/:id - Update user
  @Put("users/:id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Update user",
    description: "Update user profile information",
  })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User updated" })
  @ApiResponse({ status: 404, description: "User not found" })
  async updateUser(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto, admin.sub);
  }

  // 1️⃣4️⃣ POST /admin/users/:id/suspend
  @Post("users/:id/suspend")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Suspend user",
    description: "Suspend user with CASCADE to linked caregivers if therapist",
  })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "Suspended" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async suspendUser(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(id, admin.sub, dto.reason, dto.notes);
  }

  // 1️⃣5️⃣ POST /admin/users/:id/activate
  @Post("users/:id/activate")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Reactivate suspended user",
    description: "Reactivate suspended user",
  })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "Activated" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async activateUser(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: ActivateUserDto,
  ) {
    return this.adminService.activateUser(id, admin.sub, dto.notes);
  }

  // 1️⃣6️⃣ DELETE /admin/users/:id - Soft delete user
  @Delete("users/:id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft delete user",
    description: "Soft delete user (sets deleted flag and status to deleted)",
  })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({ status: 200, description: "User deleted" })
  @ApiResponse({ status: 404, description: "User not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async deleteUser(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() body: DeleteUserDto,
    @Query("reason") queryReason?: string,
  ) {
    const reason = body?.reason || queryReason;
    return this.adminService.deleteUser(id, admin.sub, reason);
  }

  // 1️⃣7️⃣ POST /admin/therapist-applications/:id/approve
  @Post("therapist-applications/:id/approve")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Approve therapist application",
    description: "Approve therapist and set status to ACTIVE",
  })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({ status: 200, description: "Approved" })
  @ApiResponse({ status: 404, description: "Application not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async approveApplication(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: ApproveApplicationDto,
  ) {
    return this.adminService.approveTherapistApplication(
      id,
      admin.sub,
      dto.notes,
    );
  }

  // 1️⃣8️⃣ POST /admin/therapist-applications/:id/reject
  @Post("therapist-applications/:id/reject")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Reject therapist application",
    description: "Reject therapist and increment rejection count",
  })
  @ApiParam({ name: "id", description: "Application ID" })
  @ApiResponse({ status: 200, description: "Rejected" })
  @ApiResponse({ status: 404, description: "Application not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async rejectApplication(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.adminService.rejectTherapistApplication(
      id,
      admin.sub,
      dto.reason,
      dto.notes,
    );
  }

  // 1️⃣9️⃣ DELETE /admin/therapists/:id
  @Delete("therapists/:id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "PERMANENTLY delete therapist",
    description: "Delete therapist with CASCADE revoke caregiver access",
  })
  @ApiParam({ name: "id", description: "Therapist ID" })
  @ApiResponse({ status: 200, description: "Deleted" })
  @ApiResponse({ status: 404, description: "Therapist not found" })
  @ApiResponse({ status: 403, description: "Not admin" })
  @ApiResponse({ status: 400, description: "Confirmation string mismatch" })
  async deleteTherapist(
    @Param("id") id: string,
    @CurrentUser() admin: any,
    @Body() dto: DeleteTherapistDto,
  ) {
    return this.adminService.deleteTherapist(
      id,
      admin.sub,
      dto?.confirmation,
      dto?.reason,
    );
  }

  // 2️⃣0️⃣ GET /admin/patients
  @Get("patients")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: "Get ALL patients (cross-therapist)",
    description: "Admin full access to all patients across all therapists",
  })
  @ApiQuery({ name: "therapistId", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Patients retrieved" })
  @ApiResponse({ status: 403, description: "Not admin" })
  async getAllPatients(
    @Query("therapistId") therapistId?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getAllPatients({
      therapistId,
      status,
      page: page || 1,
      limit: limit || 20,
    });
  }
}
