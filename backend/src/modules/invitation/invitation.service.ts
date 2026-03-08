import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Invitation,
  InvitationDocument,
  InvitationStatus,
} from './schemas/invitation.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Invitation.name)
    private invitationModel: Model<InvitationDocument>,
    private emailService: EmailService,
  ) { }

  private generateInvitationCode(): string {
    // Generate format: CG-XXXXXX (6 alphanumeric characters)
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = 'CG-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // Task 6: Create invitation with patient linkage
  async createInvitation(data: {
    therapistId: string;
    therapistName: string;
    patientId: string;
    patientName: string;
    caregiverEmail: string;
    caregiverName?: string;
    expiresInDays?: number;
  }): Promise<InvitationDocument> {
    const {
      therapistId,
      therapistName,
      patientId,
      patientName,
      caregiverEmail,
      caregiverName,
      expiresInDays = 7,
    } = data;

    // Generate unique invitation code
    let invitationCode = this.generateInvitationCode();

    // Ensure code is unique
    let existing = await this.invitationModel.findOne({ invitationCode });
    while (existing) {
      invitationCode = this.generateInvitationCode();
      existing = await this.invitationModel.findOne({ invitationCode });
    }

    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const invitation = new this.invitationModel({
      invitationCode,
      code: invitationCode, // Legacy field
      therapistId: new Types.ObjectId(therapistId),
      patientId: new Types.ObjectId(patientId),
      therapistName,
      patientName,
      caregiverEmail: caregiverEmail.toLowerCase(),
      caregiverName,
      recipientEmail: caregiverEmail, // Legacy field
      status: InvitationStatus.PENDING,
      expiresAt,
      isUsed: false, // Legacy field
    });

    await invitation.save();

    // Send invitation email
    await this.emailService.sendInvitationEmail(
      caregiverEmail,
      therapistName,
      invitationCode,
    );

    return invitation;
  }

  // Task 7: Validate invitation code (PUBLIC endpoint - no auth required)
  async validateInvitationCode(invitationCode: string) {
    if (!invitationCode) {
      return {
        valid: false,
        reason: 'INVALID_INPUT',
        message: 'Invitation code is required',
      };
    }

    const trimmedCode = invitationCode.trim().toUpperCase();

    const invitation = await this.invitationModel
      .findOne({
        $or: [
          { invitationCode: trimmedCode },
          { code: trimmedCode }
        ]
      })
      .populate('therapistId', 'fullName email phone phoneNumber')
      .populate('patientId', 'fullName')
      .exec();


    // Not found
    if (!invitation) {
      return {
        valid: false,
        reason: 'NOT_FOUND',
        message: 'Invitation code not found',
      };
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      // Auto-update status to EXPIRED
      if (invitation.status === InvitationStatus.PENDING) {
        invitation.status = InvitationStatus.EXPIRED;
        await invitation.save();
      }

      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'This invitation has expired',
        expired: true,
      };
    }

    // Check if already accepted
    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.isUsed
    ) {
      return {
        valid: false,
        reason: 'ALREADY_ACCEPTED',
        message: 'This invitation has already been used',
      };
    }

    // Check if declined or revoked
    if (invitation.status === InvitationStatus.DECLINED) {
      return {
        valid: false,
        reason: 'DECLINED',
        message: 'This invitation was declined',
      };
    }

    if (invitation.status === InvitationStatus.EXPIRED) {
      return {
        valid: false,
        reason: 'EXPIRED',
        message: 'This invitation has been revoked or expired',
        expired: true,
      };
    }

    // Verify that the references exist
    if (!invitation.therapistId || !invitation.patientId) {
      return {
        valid: false,
        reason: 'NOT_FOUND',
        message: 'The therapist or patient associated with this invitation no longer exists',
      };
    }

    // Valid invitation
    return {
      valid: true,
      invitation: {
        id: invitation._id,
        invitationCode: invitation.invitationCode,
        patientId: (invitation.patientId as any)._id || (invitation.patientId as any).id,
        patientName: (invitation.patientId as any).fullName || invitation.patientName,
        therapistId: (invitation.therapistId as any)._id || (invitation.therapistId as any).id,
        therapistName: (invitation.therapistId as any).fullName || invitation.therapistName,
        therapistEmail: (invitation.therapistId as any).email,
        therapistPhone: (invitation.therapistId as any).phone,
        expiresAt: invitation.expiresAt,
        expired: false,
      },
    };
  }

  // Mark invitation as accepted (called during caregiver registration)
  async markInvitationAsAccepted(
    invitationCode: string,
    caregiverId: string,
  ): Promise<InvitationDocument> {
    const invitation = await this.invitationModel.findOne({
      invitationCode: invitationCode.toUpperCase(),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = new Types.ObjectId(caregiverId);
    invitation.isUsed = true; // Legacy field
    invitation.usedAt = new Date(); // Legacy field
    invitation.usedBy = new Types.ObjectId(caregiverId); // Legacy field

    await invitation.save();

    return invitation;
  }

  // Legacy method for backward compatibility
  async validateInvitationCodeLegacy(code: string): Promise<InvitationDocument | null> {
    const invitation = await this.invitationModel.findOne({
      code: code.toUpperCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    return invitation;
  }

  // Legacy method for backward compatibility
  async markInvitationAsUsed(
    code: string,
    caregiverId: string,
  ): Promise<InvitationDocument> {
    const invitation = await this.invitationModel.findOneAndUpdate(
      { code: code.toUpperCase() },
      {
        isUsed: true,
        usedAt: new Date(),
        usedBy: new Types.ObjectId(caregiverId),
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedBy: new Types.ObjectId(caregiverId),
      },
      { new: true },
    );

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  // Task 8: Get invitations with filtering
  async getInvitations(params: {
    therapistId?: string;
    isAdmin?: boolean;
    status?: string;
    patientId?: string;
    page: number;
    limit: number;
  }) {
    const { therapistId, isAdmin, status, patientId, page, limit } = params;

    const query: any = {};

    // If not admin, filter by therapistId
    if (!isAdmin && therapistId) {
      query.therapistId = new Types.ObjectId(therapistId);
    }

    // Apply status filter
    if (status) {
      query.status = status;
    }

    // Apply patientId filter
    if (patientId) {
      query.patientId = new Types.ObjectId(patientId);
    }

    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      this.invitationModel
        .find(query)
        .populate('therapistId', 'fullName email')
        .populate('patientId', 'fullName')
        .populate('acceptedBy', 'fullName email accountStatus isEmailVerified')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.invitationModel.countDocuments(query),
    ]);

    return {
      invitations: invitations.map((inv) => ({
        id: inv._id,
        invitationCode: inv.invitationCode,
        therapistName: (inv.therapistId as any)?.fullName,
        patientId: (inv.patientId as any)?._id?.toString() || inv.patientId?.toString(),
        patientName: (inv.patientId as any)?.fullName || inv.patientName,
        caregiverEmail: inv.caregiverEmail,
        caregiverName: inv.caregiverName,
        status: inv.status,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        createdAt: inv.createdAt,
        // The user ID of the caregiver who accepted the invitation
        caregiverUserId: (inv.acceptedBy as any)?._id?.toString() || inv.acceptedBy?.toString(),
        // Include caregiver account info for accepted invitations
        caregiverAccountStatus: (inv.acceptedBy as any)?.accountStatus,
        isEmailVerified: (inv.acceptedBy as any)?.isEmailVerified ?? false,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // Task 9: Resend invitation
  async resendInvitation(
    invitationId: string,
    therapistId: string,
    isAdmin: boolean = false,
  ): Promise<InvitationDocument> {
    const query: any = { _id: new Types.ObjectId(invitationId) };

    // If not admin, ensure invitation belongs to therapist
    if (!isAdmin) {
      query.therapistId = new Types.ObjectId(therapistId);
    }

    const invitation = await this.invitationModel
      .findOne(query)
      .populate('therapistId', 'fullName')
      .populate('patientId', 'fullName')
      .exec();

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or you do not have permission',
      );
    }

    // Check if invitation is still valid to resend
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Cannot resend invitation that has already been accepted',
      );
    }

    if (invitation.status === InvitationStatus.DECLINED) {
      throw new BadRequestException(
        'Cannot resend invitation that was declined',
      );
    }

    // Extend expiration by 7 days
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update status to PENDING if it was EXPIRED
    if (invitation.status === InvitationStatus.EXPIRED) {
      invitation.status = InvitationStatus.PENDING;
    }

    await invitation.save();

    // Resend email - use stored therapistName if populate failed
    const therapistName = (invitation.therapistId as any)?.fullName || invitation.therapistName || 'Therapist';

    await this.emailService.sendInvitationEmail(
      invitation.caregiverEmail,
      therapistName,
      invitation.invitationCode,
    );

    return invitation;
  }

  // Task 10: Revoke invitation
  async revokeInvitation(
    invitationId: string,
    therapistId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    const query: any = { _id: new Types.ObjectId(invitationId) };

    // If not admin, ensure invitation belongs to therapist
    if (!isAdmin) {
      query.therapistId = new Types.ObjectId(therapistId);
    }

    const invitation = await this.invitationModel.findOne(query);

    if (!invitation) {
      throw new NotFoundException(
        'Invitation not found or you do not have permission',
      );
    }

    // Cannot revoke accepted invitations
    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Cannot revoke invitation that has already been accepted',
      );
    }

    // Update status to EXPIRED
    invitation.status = InvitationStatus.EXPIRED;
    invitation.revokedAt = new Date();

    await invitation.save();
  }

  // Get invitations by therapist (legacy method)
  async getInvitationsByTherapist(
    therapistId: string,
  ): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find({ therapistId: new Types.ObjectId(therapistId) })
      .sort({ createdAt: -1 });
  }
}
