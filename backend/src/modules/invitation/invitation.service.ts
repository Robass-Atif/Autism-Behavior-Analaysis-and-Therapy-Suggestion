import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Invitation, InvitationDocument } from './schemas/invitation.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Invitation.name)
    private invitationModel: Model<InvitationDocument>,
    private emailService: EmailService,
  ) {}

  private generateInvitationCode(): string {
    // Generate a 8-character alphanumeric code
    return uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  }

  async createInvitation(
    therapistId: string,
    therapistName: string,
    recipientEmail?: string,
  ): Promise<InvitationDocument> {
    const code = this.generateInvitationCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = new this.invitationModel({
      code,
      therapistId: new Types.ObjectId(therapistId),
      therapistName,
      recipientEmail,
      expiresAt,
    });

    await invitation.save();

    // Send invitation email if recipient email is provided
    if (recipientEmail) {
      await this.emailService.sendInvitationEmail(
        recipientEmail,
        therapistName,
        code,
      );
    }

    return invitation;
  }

  async validateInvitationCode(code: string): Promise<InvitationDocument | null> {
    const invitation = await this.invitationModel.findOne({
      code: code.toUpperCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    return invitation;
  }

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
      },
      { new: true },
    );

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  async getInvitationsByTherapist(therapistId: string): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find({ therapistId: new Types.ObjectId(therapistId) })
      .sort({ createdAt: -1 });
  }

  async revokeInvitation(
    invitationId: string,
    therapistId: string,
  ): Promise<void> {
    const result = await this.invitationModel.deleteOne({
      _id: new Types.ObjectId(invitationId),
      therapistId: new Types.ObjectId(therapistId),
      isUsed: false,
    });

    if (result.deletedCount === 0) {
      throw new BadRequestException(
        'Invitation not found or already used',
      );
    }
  }

  async resendInvitation(
    invitationId: string,
    therapistId: string,
  ): Promise<InvitationDocument> {
    const invitation = await this.invitationModel.findOne({
      _id: new Types.ObjectId(invitationId),
      therapistId: new Types.ObjectId(therapistId),
      isUsed: false,
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already used');
    }

    // Extend expiration
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    // Resend email if recipient email exists
    if (invitation.recipientEmail) {
      await this.emailService.sendInvitationEmail(
        invitation.recipientEmail,
        invitation.therapistName,
        invitation.code,
      );
    }

    return invitation;
  }
}
