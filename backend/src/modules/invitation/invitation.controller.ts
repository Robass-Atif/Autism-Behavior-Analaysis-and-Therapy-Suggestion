import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  // Task 6: POST /api/invitations - Create invitation
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create caregiver invitation',
    description:
      'Therapist creates invitation with patient linkage. Generates unique CG-XXXXXX code.',
  })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  @ApiResponse({
    status: 404,
    description: 'Patient not found or does not belong to therapist',
  })
  async createInvitation(
    @CurrentUser() user: any,
    @Body() dto: CreateInvitationDto,
  ) {
    // For now, we'll use user data from JWT
    // In production, fetch therapist and patient details from database
    const invitation = await this.invitationService.createInvitation({
      therapistId: user.sub,
      therapistName: user.fullName || 'Therapist', // Should be fetched from DB
      patientId: dto.patientId,
      patientName: 'Patient', // Should be fetched from DB
      caregiverEmail: dto.caregiverEmail,
      caregiverName: dto.caregiverName,
      expiresInDays: dto.expiresInDays || 7,
    });

    return {
      success: true,
      message: 'Invitation created and email sent',
      invitation: {
        id: invitation._id,
        invitationCode: invitation.invitationCode,
        patientName: invitation.patientName,
        caregiverEmail: invitation.caregiverEmail,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
    };
  }

  // Task 7: POST /api/invitations/validate - Validate invitation code (PUBLIC)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate invitation code (PUBLIC - no auth required)',
    description:
      'Validates invitation code during caregiver registration. Returns patient and therapist details if valid.',
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateInvitation(@Body() dto: ValidateInvitationDto) {
    return this.invitationService.validateInvitationCode(dto.invitationCode);
  }

  // Task 8: GET /api/invitations - List invitations
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: 'List invitations',
    description:
      'Get invitations with filtering. Therapist sees only their own, Admin sees all.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
  })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async getInvitations(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    return this.invitationService.getInvitations({
      therapistId: user.sub,
      isAdmin,
      status,
      patientId,
      page: page || 1,
      limit: limit || 20,
    });
  }

  // Task 9: POST /api/invitations/:id/resend - Resend invitation
  @Post(':id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: 'Resend invitation email',
    description: 'Resends invitation email and extends expiration by 7 days',
  })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  async resendInvitation(
    @Param('id') invitationId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    const invitation = await this.invitationService.resendInvitation(
      invitationId,
      user.sub,
      isAdmin,
    );

    return {
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: invitation._id,
        invitationCode: invitation.invitationCode,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
    };
  }

  // Task 10: POST /api/invitations/:id/revoke - Revoke invitation
  @Post(':id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke/expire invitation',
    description:
      'Marks invitation as EXPIRED. Cannot revoke already accepted invitations.',
  })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot revoke accepted invitation',
  })
  async revokeInvitation(
    @Param('id') invitationId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    await this.invitationService.revokeInvitation(
      invitationId,
      user.sub,
      isAdmin,
    );

    return {
      success: true,
      message: 'Invitation revoked successfully',
    };
  }

  // Legacy endpoint: GET /api/invitations/validate/:code
  @Get('validate/:code')
  @ApiOperation({
    summary: 'Validate invitation code (Legacy - use POST /validate instead)',
  })
  @ApiResponse({ status: 200, description: 'Invitation is valid' })
  @ApiResponse({ status: 404, description: 'Invalid or expired invitation' })
  async validateCodeLegacy(@Param('code') code: string) {
    return this.invitationService.validateInvitationCode(code);
  }

  // Legacy endpoint for therapist invitations
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Delete/revoke invitation (Legacy)' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  async deleteInvitation(
    @Param('id') invitationId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;

    await this.invitationService.revokeInvitation(
      invitationId,
      user.sub,
      isAdmin,
    );

    return {
      success: true,
      message: 'Invitation revoked successfully',
    };
  }
}
