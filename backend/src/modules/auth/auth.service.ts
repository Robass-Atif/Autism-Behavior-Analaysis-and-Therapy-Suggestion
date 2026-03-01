import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { InvitationService } from "../invitation/invitation.service";
import { PatientsService } from "../patients/patients.service";
import { RegisterTherapistDto } from "./dto/register-therapist.dto";
import { RegisterCaregiverDto } from "./dto/register-caregiver.dto";
import { RegisterAdminDto } from "./dto/register-admin.dto";
import { LoginDto } from "./dto/login.dto";
import { Role, AccountStatus } from "../../common/enums/role.enum";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private invitationService: InvitationService,
    private patientsService: PatientsService,
  ) {}

  private generateToken(userId: string, email: string, role: Role): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }

  private generateVerificationToken(): string {
    return uuidv4();
  }

  // Check if email is eligible for registration (3-attempt limit for rejected therapists)
  async checkRegistrationEligibility(email: string) {
    const user = await this.usersService.findByEmail(email);

    // If no user exists, email is available
    if (!user) {
      return {
        eligible: true,
        message: "Email is available for registration",
      };
    }

    // Check different account statuses
    if (user.accountStatus === AccountStatus.ACTIVE) {
      return {
        eligible: false,
        reason: "ACTIVE",
        message: "This email is already registered. Please login instead.",
      };
    }

    if (
      user.accountStatus === AccountStatus.PENDING ||
      user.accountStatus === AccountStatus.PENDING_APPROVAL ||
      user.accountStatus === AccountStatus.PENDING_VERIFICATION
    ) {
      return {
        eligible: false,
        reason: "PENDING",
        message:
          "You already have a pending application. Please wait for admin approval.",
      };
    }

    if (user.accountStatus === AccountStatus.SUSPENDED) {
      return {
        eligible: false,
        reason: "SUSPENDED",
        message:
          "Your account has been suspended. Please contact support at support@neurocare.com.",
      };
    }

    if (user.accountStatus === AccountStatus.REVOKED) {
      return {
        eligible: false,
        reason: "REVOKED",
        message:
          "Your account has been permanently deactivated. Please contact support at support@neurocare.com.",
      };
    }

    // Check rejection count for REJECTED status
    if (user.accountStatus === AccountStatus.REJECTED) {
      const rejectionCount = user.rejectionCount || 0;
      const remainingAttempts = 3 - rejectionCount;

      if (rejectionCount >= 3) {
        return {
          eligible: false,
          reason: "REJECTED",
          rejectionCount,
          remainingAttempts: 0,
          message: `Your application has been rejected ${rejectionCount} times. Maximum attempts reached. Please contact support at support@neurocare.com`,
        };
      }

      return {
        eligible: false,
        reason: "REJECTED",
        rejectionCount,
        remainingAttempts,
        message: `Your previous application was rejected. You have ${remainingAttempts} attempt(s) remaining. Please review your credentials before reapplying.`,
      };
    }

    // Default case - allow registration
    return {
      eligible: true,
      message: "Email is available for registration",
    };
  }

  async registerTherapist(
    dto: RegisterTherapistDto,
    file?: Express.Multer.File,
  ) {
    // CHECK ELIGIBILITY FIRST - prevent rejected therapists from reapplying after 3 attempts
    const eligibility = await this.checkRegistrationEligibility(dto.email);

    if (!eligibility.eligible) {
      if (
        eligibility.reason === "REJECTED" &&
        eligibility.rejectionCount &&
        eligibility.rejectionCount >= 3
      ) {
        throw new ForbiddenException(eligibility.message);
      }
      if (eligibility.reason === "ACTIVE") {
        throw new BadRequestException(eligibility.message);
      }
      if (eligibility.reason === "PENDING") {
        throw new ForbiddenException(eligibility.message);
      }
      if (
        eligibility.reason === "SUSPENDED" ||
        eligibility.reason === "REVOKED"
      ) {
        throw new ForbiddenException(eligibility.message);
      }
    }

    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // Validate terms acceptance (Handle string boolean if coming from FormData)
    const termsAccepted = String(dto.termsAccepted) === "true";
    const hipaaAccepted = String(dto.hipaaAccepted) === "true";
    const privacyPolicyAccepted = String(dto.privacyPolicyAccepted) === "true";

    if (!termsAccepted || !hipaaAccepted || !privacyPolicyAccepted) {
      throw new BadRequestException(
        "All terms and conditions must be accepted",
      );
    }

    // Handle credentials from either nested object (JSON) or flat FormData keys
    const creds = dto.credentials || ({} as any);
    const dtoAny = dto as any;
    const licenseNumber =
      creds.licenseNumber ||
      dtoAny.licenseNumber ||
      dtoAny["credentials.licenseNumber"] ||
      dtoAny["credentials[licenseNumber]"] ||
      "";
    const licenseType =
      creds.licenseType ||
      dtoAny.licenseType ||
      dtoAny["credentials.licenseType"] ||
      dtoAny["credentials[licenseType]"] ||
      "";
    const otherLicenseType =
      creds.otherLicenseType ||
      dtoAny.otherLicenseType ||
      dtoAny["credentials.otherLicenseType"] ||
      undefined;
    const issuingAuthority =
      creds.issuingAuthority ||
      dtoAny.issuingAuthority ||
      dtoAny["credentials.issuingAuthority"] ||
      dtoAny["credentials[issuingAuthority]"] ||
      "";
    const licenseExpiryDateRaw =
      creds.licenseExpiryDate ||
      dtoAny.licenseExpiryDate ||
      dtoAny["credentials.licenseExpiryDate"] ||
      dtoAny["credentials[licenseExpiryDate]"] ||
      "";

    // Create therapist
    const therapist = await this.usersService.createTherapist({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      phoneNumber: dto.phoneNumber,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      professionalTitle: dto.professionalTitle,
      otherProfessionalTitle: dto.otherProfessionalTitle,
      credentials: {
        licenseNumber,
        licenseType,
        otherLicenseType,
        issuingAuthority,
        licenseExpiryDate: licenseExpiryDateRaw
          ? new Date(licenseExpiryDateRaw)
          : new Date(),
        isLicenseVerified: false,
        licenseCertificatePath: file ? `licenses/${file.filename}` : undefined,
      },
      organization: {
        organizationName: dto.organizationName,
        department: dto.department,
        workAddress: dto.workAddress,
        city: dto.city,
        stateProvince: dto.stateProvince,
        zipPostalCode: dto.zipPostalCode,
        country: dto.country,
      },
      references: dto.references,
      termsAccepted: dto.termsAccepted,
      hipaaAccepted: dto.hipaaAccepted,
      privacyPolicyAccepted: dto.privacyPolicyAccepted,
      twoFactorEnabled: dto.twoFactorEnabled,
      twoFactorMethod: dto.twoFactorMethod,
      bio: dto.bio,
      yearsOfExperience: dto.yearsOfExperience
        ? Number(dto.yearsOfExperience)
        : undefined,
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
      message: "Therapist registration submitted. Please verify your email.",
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
      throw new BadRequestException("Passwords do not match");
    }

    // Validate terms acceptance
    if (
      !dto.termsAccepted ||
      !dto.privacyPolicyAccepted ||
      !dto.videoRecordingConsentAccepted
    ) {
      throw new BadRequestException(
        "All terms and conditions must be accepted",
      );
    }

    let invitedBy: string | undefined;
    let linkedPatientId: string | undefined;
    let linkedPatientName: string | undefined;

    // TASK 11: Validate invitation code - REQUIRED for caregiver registration
    if (!dto.invitationCode) {
      throw new BadRequestException(
        "Invitation code is required for caregiver registration",
      );
    }

    // Validate invitation code using new method
    const validationResult =
      await this.invitationService.validateInvitationCode(dto.invitationCode);

    if (!validationResult.valid) {
      // Return specific error message based on reason
      if (validationResult.reason === "NOT_FOUND") {
        throw new BadRequestException(
          validationResult.message || "Invitation code not found",
        );
      }
      if (validationResult.reason === "EXPIRED") {
        throw new ForbiddenException(
          "This invitation has expired. Please request a new invitation from your therapist.",
        );
      }
      if (validationResult.reason === "ALREADY_ACCEPTED") {
        throw new BadRequestException(
          "This invitation code has already been used",
        );
      }
      throw new BadRequestException(validationResult.message);
    }

    // Extract information from valid invitation
    if (validationResult.invitation) {
      invitedBy = validationResult.invitation.therapistId.toString();
      linkedPatientId = validationResult.invitation.patientId.toString();
      linkedPatientName = validationResult.invitation.patientName;
    }

    // Create caregiver
    const caregiver = await this.usersService.createCaregiver({
      fullName: dto.fullName,
      email: dto.email,
      password: dto.password,
      phoneNumber: dto.phoneNumber,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      preferredLanguage: dto.preferredLanguage,
      otherLanguage: dto.otherLanguage,
      relationshipType: dto.relationshipType,
      otherRelationshipType: dto.otherRelationshipType,
      invitationCode: dto.invitationCode,
      invitedBy: invitedBy as any,
      emergencyContact: dto.emergencyContact,
      notificationPreferences: {
        emailNotifications:
          dto.notificationPreferences?.emailNotifications ?? true,
        smsNotifications:
          dto.notificationPreferences?.smsNotifications ?? false,
        recordingReminders:
          dto.notificationPreferences?.recordingReminders ?? true,
      },
      termsAccepted: dto.termsAccepted,
      privacyPolicyAccepted: dto.privacyPolicyAccepted,
      videoRecordingConsentAccepted: dto.videoRecordingConsentAccepted,
    });

    const authUser = await this.usersService.findByEmail(caregiver.email);
    const caregiverUserId = authUser
      ? authUser._id.toString()
      : caregiver._id.toString();

    // Mark invitation as accepted (updates status to ACCEPTED)
    await this.invitationService.markInvitationAsAccepted(
      dto.invitationCode,
      caregiverUserId,
    );

    // Create patient-caregiver link in patient_caregivers table
    if (linkedPatientId) {
      await this.patientsService.linkCaregiverToPatient(
        linkedPatientId,
        caregiverUserId, // the user model id
      );
    }

    // Generate and save email verification token
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.usersService.setEmailVerificationToken(
      caregiverUserId,
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
      message: "Caregiver registration submitted. Please verify your email.",
      data: {
        _id: caregiverUserId,
        fullName: caregiver.fullName,
        email: caregiver.email,
        role: caregiver.role,
        accountStatus: authUser?.accountStatus || caregiver.accountStatus,
        linkedPatient: {
          id: linkedPatientId,
          name: linkedPatientName,
        },
      },
    };
  }

  async registerAdmin(dto: RegisterAdminDto) {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // Validate all terms acceptance (only if provided)
    if (dto.adminCodeOfConductAccepted !== undefined) {
      if (
        !dto.adminCodeOfConductAccepted ||
        !dto.systemAccessPolicyAccepted ||
        !dto.securityResponsibilityAccepted ||
        !dto.hipaaAccepted
      ) {
        throw new BadRequestException(
          "All terms and conditions must be accepted",
        );
      }
    }

    // // Validate organizational email domain (only if allowed domains are configured)
    // const allowedDomains = this.configService
    //   .get<string>('ALLOWED_ADMIN_DOMAINS', '')
    //   .split(',')
    //   .map((d) => d.trim());

    // if (allowedDomains.length > 0) {
    //   const emailDomain = dto.email.split('@')[1];
    //   if (!allowedDomains.includes(emailDomain)) {
    //     throw new BadRequestException(
    //       'Admin email must be from an authorized organizational domain',
    //     );
    //   }
    // }

    // Validate approval code from super admin (only if provided)
    if (dto.approvingSuperAdminEmail && dto.approvalCode) {
      const isValidApproval = await this.validateAdminApprovalCode(
        dto.approvingSuperAdminEmail,
        dto.approvalCode,
      );

      if (!isValidApproval) {
        throw new BadRequestException(
          "Invalid approval code or super admin email",
        );
      }
    }

    // Create admin
    try {
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

      return {
        success: true,
        message: "Admin registration successful.",
        data: {
          _id: admin._id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          adminLevel: admin.adminLevel,
          accountStatus: admin.accountStatus,
        },
      };
    } catch (error: any) {
      // Handle duplicate key error
      if (error.code === 11000) {
        throw new BadRequestException(
          "An account with this email already exists",
        );
      }
      throw error;
    }
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
    console.log(`📧 Verifying email with token: ${token}`);
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.usersService.verifyEmail(user._id.toString());

    const responseMessage =
      user.role === Role.THERAPIST || user.role === Role.ADMIN
        ? "Email verified successfully. Your account is pending admin approval."
        : "Email verified successfully. You can now login.";

    return {
      success: true,
      message: responseMessage,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      console.error(`🔓 LOGIN_FAIL: User not found for email: ${dto.email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      console.error(`🔓 LOGIN_FAIL: Password mismatch for email: ${dto.email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    // Check email verification first
    if (!user.isEmailVerified) {
      throw new ForbiddenException({
        success: false,
        error: "ACCOUNT_NOT_ACTIVE",
        status: "PENDING_VERIFICATION",
        message: "Please verify your email before logging in",
      });
    }

    // CRITICAL: Check account status - MUST be ACTIVE to login
    if (user.accountStatus !== AccountStatus.ACTIVE) {
      const statusMessages = {
        [AccountStatus.PENDING]:
          "Your account is pending approval. Please wait for admin verification.",
        [AccountStatus.PENDING_APPROVAL]:
          "Your account is pending admin approval.",
        [AccountStatus.PENDING_VERIFICATION]:
          "Please verify your email before logging in.",
        [AccountStatus.REJECTED]:
          "Your account application was rejected. Please contact support at support@neurocare.com for more information.",
        [AccountStatus.SUSPENDED]:
          "Your account has been suspended. Please contact administrator for assistance.",
        [AccountStatus.REVOKED]:
          "Your account has been permanently deactivated. Please contact support at support@neurocare.com.",
        [AccountStatus.DEACTIVATED]:
          "Your account has been deactivated. Please contact administrator.",
        [AccountStatus.DELETED]:
          "Your account has been deleted. Please contact support at support@neurocare.com for more information.",
      };

      throw new ForbiddenException({
        success: false,
        error: "ACCOUNT_NOT_ACTIVE",
        status: user.accountStatus,
        message:
          statusMessages[user.accountStatus] || "Your account is not active",
      });
    }

    // Additional check for legacy isActive field
    if (!user.isActive) {
      throw new ForbiddenException({
        success: false,
        error: "ACCOUNT_NOT_ACTIVE",
        status: "DEACTIVATED",
        message: "Your account has been deactivated",
      });
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
      message: "Login successful",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        onboardingCompleted: user.onboardingCompleted ?? false,
        token,
      },
      token, // Also return token at root level for cookie setting
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        success: true,
        message: "If the email exists, a password reset link will be sent.",
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
      message: "If the email exists, a password reset link will be sent.",
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    await this.usersService.updatePassword(user._id.toString(), newPassword);

    return {
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.isEmailVerified) {
      throw new BadRequestException("Email is already verified");
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
      message: "Verification email sent successfully.",
    };
  }

  // Complete therapist onboarding
  async completeOnboarding(userId: string, dto: any) {
    console.log("📋 Starting completeOnboarding for user:", userId);
    console.log("📋 Onboarding data:", dto);

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.role !== Role.THERAPIST) {
      throw new ForbiddenException("Only therapists can complete onboarding");
    }

    // Update user with onboarding information
    const updateData = {
      onboardingCompleted: true,
      clinicName: dto.clinicName,
      clinicAddress: dto.clinicAddress,
      specialties: dto.specialties,
      workingHours: dto.workingHours,
      consultationFee: dto.consultationFee
        ? parseFloat(dto.consultationFee) || 0
        : undefined,
    };

    console.log("📋 Updating therapist with:", updateData);

    await this.usersService.updateUser(userId, updateData as any);

    const updatedUser = await this.usersService.findById(userId);

    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }

    console.log(
      "✅ Onboarding completed. User onboardingCompleted:",
      updatedUser.onboardingCompleted,
    );

    return {
      success: true,
      message: "Onboarding completed successfully",
      user: {
        id: updatedUser._id,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  async logout(userId: string) {
    // In a stateless JWT implementation, the client is responsible for clearing the token.
    // This method is a placeholder for any server-side logout logic, such as blacklisting tokens.
    return {
      success: true,
      message: "Logged out successfully",
    };
  }
}
