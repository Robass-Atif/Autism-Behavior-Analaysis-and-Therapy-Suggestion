import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role, AccountStatus } from "../../common/enums/role.enum";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get all users (Admin only)" })
  @ApiQuery({ name: "role", required: false, enum: Role })
  @ApiResponse({ status: 200, description: "List of all users" })
  async getAllUsers(@Query("role") role?: Role) {
    const users = await this.usersService.getAllUsers(role);
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get("pending-approvals")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get users pending approval (Admin only)" })
  @ApiResponse({ status: 200, description: "List of pending users" })
  async getPendingApprovals() {
    const users = await this.usersService.getPendingApprovals();
    return {
      success: true,
      count: users.length,
      data: users,
    };
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Current user data" })
  async getMe(@CurrentUser() user: any) {
    const userData = await this.usersService.findById(user.sub);
    return {
      success: true,
      data: userData,
    };
  }

  @Put("profile")
  @ApiOperation({ summary: "Update my profile" })
  @ApiResponse({ status: 200, description: "Profile updated" })
  async updateProfile(@CurrentUser() user: any, @Body() updateData: any) {
    const updatedUser = await this.usersService.updateUser(
      user.sub,
      updateData,
    );
    return {
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    };
  }

  @Put("change-password")
  @ApiOperation({ summary: "Change my password" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Invalid passwords" })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: any,
  ) {
    await this.usersService.changePassword(
      user.sub,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
      changePasswordDto.confirmPassword,
    );
    return {
      success: true,
      message: "Password changed successfully",
    };
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Get user by ID (Admin only)" })
  @ApiResponse({ status: 200, description: "User data" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    return {
      success: true,
      data: user,
    };
  }

  @Put(":id/approve")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Approve user registration (Admin only)" })
  @ApiResponse({ status: 200, description: "User approved" })
  async approveUser(
    @Param("id") id: string,
    @CurrentUser("userId") adminId: string,
  ) {
    const user = await this.usersService.approveUser(id, adminId);
    return {
      success: true,
      message: "User approved successfully",
      data: user,
    };
  }

  @Put(":id/reject")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Reject user registration (Admin only)" })
  @ApiResponse({ status: 200, description: "User rejected" })
  async rejectUser(@Param("id") id: string, @Body("reason") reason: string) {
    const user = await this.usersService.rejectUser(id, reason);
    return {
      success: true,
      message: "User rejected",
      data: user,
    };
  }

  @Put(":id/status")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Update user status (Admin only)" })
  @ApiResponse({ status: 200, description: "User status updated" })
  async updateUserStatus(
    @Param("id") id: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateUserStatus(
      id,
      updateStatusDto.status,
    );
    return {
      success: true,
      message: "User status updated successfully",
      data: user,
    };
  }

  @Delete(":id")
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: "Delete user (Admin only)" })
  @ApiResponse({ status: 200, description: "User deleted" })
  async deleteUser(@Param("id") id: string) {
    await this.usersService.deleteUser(id);
    return {
      success: true,
      message: "User deleted successfully",
    };
  }
}
