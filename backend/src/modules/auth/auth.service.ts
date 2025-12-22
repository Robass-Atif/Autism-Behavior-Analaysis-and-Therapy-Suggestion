import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { InvitationService } from '../invitation/invitation.service';
import { RegisterTherapistDto } from './dto/register-therapist.dto';
import { RegisterCaregiverDto } from './dto/register-caregiver.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { Role, AccountStatus } from '../../common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private invitationService: InvitationService,
  ) {}

  private generateToken(userId: string, email: string, role: Role): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  private generateVerificationToken(): string {
    return uuidv4();
  }

  async registerTherapist(dto: RegisterTherapistDto) {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate terms acceptance
    if (!dto.termsAccepted || !dto.hipaaAccepted || !dto.privacyPolicyAccepted) {
      throw new BadRequestException('All terms and conditions must be accepted');
    }

    // Create therapist
    const therapist = await this.usersService.createTherapist({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      phoneNumber: dto.phoneNumber,
      professionalTitle: dto.professionalTitle,
      otherProfessionalTitle: dto.otherProfessionalTitle,
      credentials: {
        licenseNumber: dto.credentials.licenseNumber,
        licenseType: dto.credentials.licenseType,
        otherLicenseType: dto.credentials.otherLicenseType,
        issuingAuthority: dto.credentials.issuingAuthority,
        licenseExpiryDate: new Date(dto.credentials.licenseExpiryDate),
      },
      organization: dto.organization,
      references: dto.references,
      termsAccepted: dto.termsAccepted,
      hipaaAccepted: dto.hipaaAccepted,
      privacyPolicyAccepted: dto.privacyPolicyAccepted,
      twoFactorEnabled: dto.twoFactorEnabled,
      twoFactorMethod: dto.twoFactorMethod,
    });

    // Generate and save email verification token
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.usersService.setEmailVerificationToken(
      therapist._id.toString(),
      verificationToken,
      verificationExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      therapist.email,
      therapist.fullName,
      verificationToken,
    );

    return {
      success: true,
      message: 'Therapist registration submitted. Please verify your email.',
      data: {
        _id: therapist._id,
        fullName: therapist.fullName,
        email: therapist.email,
        role: therapist.role,
        accountStatus: therapist.accountStatus,
      },
    };
  }

  async registerCaregiver(dto: RegisterCaregiverDto) {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate terms acceptance
    if (
      !dto.termsAccepted ||
      !dto.privacyPolicyAccepted ||
      !dto.videoRecordingConsentAccepted
    ) {
      throw new BadRequestException('All terms and conditions must be accepted');
    }

    let invitedBy: string | undefined;

    // Validate invitation code if provided
    if (dto.invitationCode) {
      const invitation = await this.invitationService.validateInvitationCode(
        dto.invitationCode,
      );
      if (!invitation) {
        throw new BadRequestException('Invalid or expired invitation code');
      }
      invitedBy = invitation.therapistId.toString();
    }

    // Create caregiver
    const caregiver = await this.usersService.createCaregiver({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      phoneNumber: dto.phoneNumber,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      preferredLanguage: dto.preferredLanguage,
      otherLanguage: dto.otherLanguage,
      relationshipType: dto.relationshipType,
      otherRelationshipType: dto.otherRelationshipType,
      invitationCode: dto.invitationCode,
      invitedBy: invitedBy as any,
      emergencyContact: dto.emergencyContact,
      notificationPreferences: dto.notificationPreferences || {
        emailNotifications: true,
        smsNotifications: false,
        recordingReminders: true,
      },
      termsAccepted: dto.termsAccepted,
      privacyPolicyAccepted: dto.privacyPolicyAccepted,
      videoRecordingConsentAccepted: dto.videoRecordingConsentAccepted,
    });

    // Mark invitation as used
    if (dto.invitationCode) {
      await this.invitationService.markInvitationAsUsed(
        dto.invitationCode,
        caregiver._id.toString(),
      );
    }

    // Generate and save email verification token
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setEmailVerificationToken(
      caregiver._id.toString(),
      verificationToken,
      verificationExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      caregiver.email,
      caregiver.fullName,
      verificationToken,
    );

    return {
      success: true,
      message: 'Caregiver registration submitted. Please verify your email.',
      data: {
        _id: caregiver._id,
        fullName: caregiver.fullName,
        email: caregiver.email,
        role: caregiver.role,
        accountStatus: caregiver.accountStatus,
      },
    };
  }

  async registerAdmin(dto: RegisterAdminDto) {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate all terms acceptance
    if (
      !dto.adminCodeOfConductAccepted ||
      !dto.systemAccessPolicyAccepted ||
      !dto.securityResponsibilityAccepted ||
      !dto.hipaaAccepted
    ) {
      throw new BadRequestException('All terms and conditions must be accepted');
    }

    // Validate organizational email domain
    const allowedDomains = this.configService
      .get<string>('ALLOWED_ADMIN_DOMAINS', '')
      .split(',')
      .map((d) => d.trim());

    const emailDomain = dto.email.split('@')[1];
    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      throw new BadRequestException(
        'Admin email must be from an authorized organizational domain',
      );
    }

    // Validate approval code from super admin
    const isValidApproval = await this.validateAdminApprovalCode(
      dto.approvingSuperAdminEmail,
      dto.approvalCode,
    );

    if (!isValidApproval) {
      throw new BadRequestException('Invalid approval code or super admin email');
    }

    // Create admin
    const admin = await this.usersService.createAdmin({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      phoneNumber: dto.phoneNumber,
      employeeId: dto.employeeId,
      adminLevel: dto.adminLevel,
      organizationName: dto.organizationName,
      department: dto.department,
      twoFactorMethod: dto.twoFactorMethod,
      backupEmail: dto.backupEmail,
      securityQuestions: dto.securityQuestions,
      accessJustification: dto.accessJustification,
      approvalCode: dto.approvalCode,
      adminCodeOfConductAccepted: dto.adminCodeOfConductAccepted,
      systemAccessPolicyAccepted: dto.systemAccessPolicyAccepted,
      securityResponsibilityAccepted: dto.securityResponsibilityAccepted,
      hipaaAccepted: dto.hipaaAccepted,
      twoFactorEnabled: true,
    });

    // Generate and save email verification token
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setEmailVerificationToken(
      admin._id.toString(),
      verificationToken,
      verificationExpires,
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(
      admin.email,
      admin.fullName,
      verificationToken,
    );

    return {
      success: true,
      message:
        'Admin registration submitted. Please verify your email and complete 2FA setup.',
      data: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        adminLevel: admin.adminLevel,
        accountStatus: admin.accountStatus,
      },
    };
  }

  async validateAdminApprovalCode(
    superAdminEmail: string,
    approvalCode: string,
  ): Promise<boolean> {
    // In production, this would verify against stored approval codes
    // For now, we'll check if the super admin exists
    const superAdmin = await this.usersService.findByEmail(superAdminEmail);
    if (!superAdmin || superAdmin.role !== Role.SUPER_ADMIN) {
      return false;
    }
    // TODO: Implement proper approval code validation
    return approvalCode.length >= 6;
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersService.verifyEmail(user._id.toString());

    const responseMessage =
      user.role === Role.THERAPIST || user.role === Role.ADMIN
        ? 'Email verified successfully. Your account is pending admin approval.'
        : 'Email verified successfully. You can now login.';

    return {
      success: true,
      message: responseMessage,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check account status
    if (!user.isActive) {
      throw new ForbiddenException('Your account has been deactivated');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    if (user.accountStatus === AccountStatus.PENDING_APPROVAL) {
      throw new ForbiddenException('Your account is pending admin approval');
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended');
    }

    // Update last login
    await this.usersService.updateLastLogin(user._id.toString());

    // Generate token
    const token = this.generateToken(
      user._id.toString(),
      user.email,
      user.role,
    );

    return {
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        token,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: 'If the email exists, a password reset link will be sent.',
      };
    }

    const resetToken = this.generateVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.usersService.setPasswordResetToken(
      user._id.toString(),
      resetToken,
      resetExpires,
    );

    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.fullName,
      resetToken,
    );

    return {
      success: true,
      message: 'If the email exists, a password reset link will be sent.',
    };
  }

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.updatePassword(user._id.toString(), newPassword);

    return {
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      verificationExpires,
    );

    await this.emailService.sendVerificationEmail(
      user.email,
      user.fullName,
      verificationToken,
    );

    return {
      success: true,
      message: 'Verification email sent successfully.',
    };
  }
}
