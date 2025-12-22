import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('Invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Roles(Role.THERAPIST)
  @ApiOperation({ summary: 'Create a new caregiver invitation (Therapist only)' })
  @ApiResponse({ status: 201, description: 'Invitation created successfully' })
  async createInvitation(
    @CurrentUser('userId') therapistId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    // Get therapist name from the service or pass it in
    const invitation = await this.invitationService.createInvitation(
      therapistId,
      dto.therapistName,
      dto.recipientEmail,
    );

    return {
      success: true,
      message: dto.recipientEmail
        ? 'Invitation created and email sent'
        : 'Invitation code created',
      data: {
        code: invitation.code,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  @Get()
  @Roles(Role.THERAPIST)
  @ApiOperation({ summary: 'Get all invitations created by therapist' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async getMyInvitations(@CurrentUser('userId') therapistId: string) {
    const invitations = await this.invitationService.getInvitationsByTherapist(
      therapistId,
    );

    return {
      success: true,
      count: invitations.length,
      data: invitations,
    };
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate an invitation code (Public)' })
  @ApiResponse({ status: 200, description: 'Invitation is valid' })
  @ApiResponse({ status: 404, description: 'Invalid or expired invitation' })
  async validateCode(@Param('code') code: string) {
    const invitation = await this.invitationService.validateInvitationCode(code);

    if (!invitation) {
      return {
        success: false,
        message: 'Invalid or expired invitation code',
      };
    }

    return {
      success: true,
      message: 'Invitation code is valid',
      data: {
        therapistName: invitation.therapistName,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  @Post(':id/resend')
  @Roles(Role.THERAPIST)
  @ApiOperation({ summary: 'Resend an invitation email' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  async resendInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') therapistId: string,
  ) {
    const invitation = await this.invitationService.resendInvitation(
      invitationId,
      therapistId,
    );

    return {
      success: true,
      message: 'Invitation resent successfully',
      data: invitation,
    };
  }

  @Delete(':id')
  @Roles(Role.THERAPIST)
  @ApiOperation({ summary: 'Revoke an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation revoked' })
  async revokeInvitation(
    @Param('id') invitationId: string,
    @CurrentUser('userId') therapistId: string,
  ) {
    await this.invitationService.revokeInvitation(invitationId, therapistId);

    return {
      success: true,
      message: 'Invitation revoked successfully',
    };
  }
}
