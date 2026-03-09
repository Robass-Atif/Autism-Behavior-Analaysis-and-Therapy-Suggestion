import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import { Therapist, TherapistDocument } from "./schemas/therapist.schema";
import { Caregiver, CaregiverDocument } from "./schemas/caregiver.schema";
import { Admin, AdminDocument } from "./schemas/admin.schema";
import { Role, AccountStatus } from "../../common/enums/role.enum";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) public userModel: Model<UserDocument>,
    @InjectModel(Therapist.name)
    private therapistModel: Model<TherapistDocument>,
    @InjectModel(Caregiver.name)
    private caregiverModel: Model<CaregiverDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    const normalizedEmail = email.toLowerCase();

    // Search in all user collections
    let user = await this.therapistModel
      .findOne({ email: normalizedEmail })
      .select("+password");
    if (user) return user as unknown as UserDocument;

    user = await this.caregiverModel
      .findOne({ email: normalizedEmail })
      .select("+password");
    if (user) return user as unknown as UserDocument;

    user = await this.adminModel
      .findOne({ email: normalizedEmail })
      .select("+password");
    if (user) return user as unknown as UserDocument;

    return this.userModel
      .findOne({ email: normalizedEmail })
      .select("+password");
  }

  async findById(id: string): Promise<UserDocument | null> {
    // Search in all user collections
    let user = await this.therapistModel.findById(id);
    if (user) return user as unknown as UserDocument;

    user = await this.caregiverModel.findById(id);
    if (user) return user as unknown as UserDocument;

    user = await this.adminModel.findById(id);
    if (user) return user as unknown as UserDocument;

    return this.userModel.findById(id);
  }

  async findTherapistById(id: string): Promise<TherapistDocument | null> {
    return this.therapistModel.findById(id);
  }

  async findCaregiverById(id: string): Promise<CaregiverDocument | null> {
    return this.caregiverModel.findById(id);
  }

  async findAdminById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id);
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    return !!user;
  }

  async createTherapist(
    data: Partial<Therapist> & { email: string },
  ): Promise<TherapistDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException("Email already registered");
    }

    const user = new this.userModel({
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: Role.THERAPIST,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });
    const savedUser = await user.save();

    const therapist = new this.therapistModel({
      ...data,
      userId: savedUser._id,
      email: data.email.toLowerCase(),
      role: Role.THERAPIST,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    return therapist.save();
  }

  async createCaregiver(
    data: Partial<Caregiver> & { email: string },
  ): Promise<CaregiverDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException("Email already registered");
    }

    const user = new this.userModel({
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: Role.CAREGIVER,
      accountStatus: (data as any).accountStatus || AccountStatus.PENDING_VERIFICATION,
      isEmailVerified: (data as any).isEmailVerified || false,
    });
    const savedUser = await user.save();

    const caregiver = new this.caregiverModel({
      ...data,
      userId: savedUser._id,
      email: data.email.toLowerCase(),
      role: Role.CAREGIVER,
      accountStatus: (data as any).accountStatus || AccountStatus.PENDING_VERIFICATION,
      isEmailVerified: (data as any).isEmailVerified || false,
    });

    return caregiver.save();
  }

  async createAdmin(
    data: Partial<Admin> & { email: string },
  ): Promise<AdminDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException("Email already registered");
    }

    const user = new this.userModel({
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: data.password,
      phoneNumber: data.phoneNumber,
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      isEmailVerified: true,
    });
    const savedUser = await user.save();

    const admin = new this.adminModel({
      ...data,
      userId: savedUser._id,
      email: data.email.toLowerCase(),
      role: Role.ADMIN,
      isEmailVerified: true,
      accountStatus: AccountStatus.ACTIVE,
    });

    return admin.save();
  }

  async verifyEmail(userId: string): Promise<UserDocument> {
    const normalizedEmail = await this.getEmailById(userId);

    // Update in all collections
    const update = {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    };

    const therapist = await this.therapistModel.findById(userId);
    if (therapist) {
      therapist.isEmailVerified = true;
      therapist.emailVerificationToken = undefined;
      therapist.emailVerificationExpires = undefined;
      therapist.accountStatus = AccountStatus.PENDING_APPROVAL;
      await therapist.save();
    }

    const caregiver = await this.caregiverModel.findById(userId);
    if (caregiver) {
      caregiver.isEmailVerified = true;
      caregiver.emailVerificationToken = undefined;
      caregiver.emailVerificationExpires = undefined;
      caregiver.accountStatus = AccountStatus.ACTIVE;
      await caregiver.save();
    }

    const admin = await this.adminModel.findById(userId);
    if (admin) {
      admin.isEmailVerified = true;
      admin.emailVerificationToken = undefined;
      admin.emailVerificationExpires = undefined;
      admin.accountStatus = AccountStatus.PENDING_APPROVAL;
      await admin.save();
    }

    const user = await this.userModel.findById(userId);
    if (user) {
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      // Also update linked user if this was a role-specific account
      if (user.role === Role.THERAPIST || user.role === Role.ADMIN) {
        user.accountStatus = AccountStatus.PENDING_APPROVAL;
      } else if (user.role === Role.CAREGIVER) {
        user.accountStatus = AccountStatus.ACTIVE;
      }
      await user.save();
    }

    // If we have an email, ensure BOTH documents are synced
    if (normalizedEmail) {
      await this.syncVerificationStatus(normalizedEmail);
    }

    return (user || therapist || caregiver || admin) as UserDocument;
  }

  private async getEmailById(id: string): Promise<string | null> {
    const user = await this.findById(id);
    return user?.email || null;
  }

  private async syncVerificationStatus(email: string) {
    const update = {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    };

    await Promise.all([
      this.userModel.findOneAndUpdate({ email }, update),
      this.therapistModel.findOneAndUpdate({ email }, update),
      this.caregiverModel.findOneAndUpdate({ email }, update),
      this.adminModel.findOneAndUpdate({ email }, update),
    ]);
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const email = user.email;
    const update = {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    };

    await Promise.all([
      this.userModel.findOneAndUpdate({ email }, update),
      this.therapistModel.findOneAndUpdate({ email }, update),
      this.caregiverModel.findOneAndUpdate({ email }, update),
      this.adminModel.findOneAndUpdate({ email }, update),
    ]);
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    const query = {
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    };

    let user = await this.therapistModel.findOne(query);
    if (user) return user as unknown as UserDocument;

    user = await this.caregiverModel.findOne(query);
    if (user) return user as unknown as UserDocument;

    user = await this.adminModel.findOne(query);
    if (user) return user as unknown as UserDocument;

    return this.userModel.findOne(query);
  }

  async getAllUsers(role?: Role): Promise<UserDocument[]> {
    // Query the correct collection based on role
    if (role === Role.THERAPIST) {
      return this.therapistModel
        .find({ deleted: { $ne: true } })
        .select("-password") as unknown as UserDocument[];
    }
    if (role === Role.CAREGIVER) {
      return this.caregiverModel
        .find({ deleted: { $ne: true } })
        .select("-password") as unknown as UserDocument[];
    }
    if (role === Role.ADMIN) {
      return this.adminModel
        .find({ deleted: { $ne: true } })
        .select("-password") as unknown as UserDocument[];
    }
    if (role === Role.PATIENT) {
      return this.userModel
        .find({ role: Role.PATIENT, deleted: { $ne: true } })
        .select("-password");
    }
    // For no role specified, query all collections
    const [therapists, caregivers, admins] = await Promise.all([
      this.therapistModel.find({ deleted: { $ne: true } }).select("-password"),
      this.caregiverModel.find({ deleted: { $ne: true } }).select("-password"),
      this.adminModel.find({ deleted: { $ne: true } }).select("-password"),
    ]);
    return [
      ...therapists,
      ...caregivers,
      ...admins,
    ] as unknown as UserDocument[];
  }

  async getPendingApprovals(): Promise<UserDocument[]> {
    // Get pending therapists from the therapists collection
    return this.therapistModel
      .find({
        accountStatus: {
          $in: [
            AccountStatus.PENDING_APPROVAL,
            AccountStatus.PENDING_VERIFICATION,
          ],
        },
      })
      .select("-password") as unknown as UserDocument[];
  }

  async approveUser(userId: string, approvedBy: string): Promise<UserDocument> {
    // Find user in the correct collection based on role
    let user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.accountStatus = AccountStatus.ACTIVE;

    if (user.role === Role.THERAPIST) {
      await this.therapistModel.findByIdAndUpdate(userId, {
        accountStatus: AccountStatus.ACTIVE,
        isAdminApproved: true,
        adminApprovalDate: new Date(),
        adminApprovalBy: approvedBy,
      });
    } else if (user.role === Role.CAREGIVER) {
      await this.caregiverModel.findByIdAndUpdate(userId, {
        accountStatus: AccountStatus.ACTIVE,
      });
    } else if (user.role === Role.ADMIN) {
      await this.adminModel.findByIdAndUpdate(userId, {
        accountStatus: AccountStatus.ACTIVE,
        isApproved: true,
        approvalDate: new Date(),
        approvedBy: new Types.ObjectId(approvedBy),
      });
    }

    return user;
  }

  async rejectUser(userId: string, reason: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.accountStatus = AccountStatus.SUSPENDED;

    if (user.role === Role.THERAPIST) {
      await this.therapistModel.findByIdAndUpdate(userId, {
        isAdminApproved: false,
        rejectionReason: reason,
      });
    }

    return user.save();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    });
  }

  async updateUserStatus(
    userId: string,
    status: AccountStatus,
  ): Promise<UserDocument> {
    // First, find the user to determine their role/collection
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    // Update in the correct collection based on role
    let user: UserDocument | null = null;

    if (existingUser.role === Role.THERAPIST) {
      user = (await this.therapistModel.findByIdAndUpdate(
        userId,
        { accountStatus: status },
        { new: true },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.CAREGIVER) {
      user = (await this.caregiverModel.findByIdAndUpdate(
        userId,
        { accountStatus: status },
        { new: true },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.ADMIN) {
      user = (await this.adminModel.findByIdAndUpdate(
        userId,
        { accountStatus: status },
        { new: true },
      )) as unknown as UserDocument;
    } else {
      user = await this.userModel.findByIdAndUpdate(
        userId,
        { accountStatus: status },
        { new: true },
      );
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(userId);
    if (!result) {
      throw new NotFoundException("User not found");
    }
  }

  async assignPatientToCaregiver(
    caregiverId: string,
    patientId: string,
  ): Promise<CaregiverDocument> {
    const caregiver = await this.caregiverModel.findByIdAndUpdate(
      caregiverId,
      { $addToSet: { assignedPatients: new Types.ObjectId(patientId) } },
      { new: true },
    );

    if (!caregiver) {
      throw new NotFoundException("Caregiver not found");
    }

    return caregiver;
  }

  async getCaregiversByTherapist(
    therapistId: string,
  ): Promise<CaregiverDocument[]> {
    return this.caregiverModel.find({
      invitedBy: new Types.ObjectId(therapistId),
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });
  }

  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      })
      .select("+password");
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Also update in role-specific collection
    const email = user.email;
    await Promise.all([
      this.therapistModel.findOneAndUpdate(
        { email },
        { password: user.password },
      ),
      this.caregiverModel.findOneAndUpdate(
        { email },
        { password: user.password },
      ),
      this.adminModel.findOneAndUpdate({ email }, { password: user.password }),
    ]);
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new ConflictException("Passwords do not match");
    }

    const user = await this.userModel.findById(userId).select("+password");
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw new ConflictException("Current password is incorrect");
    }

    user.password = newPassword;
    await user.save();

    // Also update in role-specific collection
    const email = user.email;
    await Promise.all([
      this.therapistModel.findOneAndUpdate(
        { email },
        { password: user.password },
      ),
      this.caregiverModel.findOneAndUpdate(
        { email },
        { password: user.password },
      ),
      this.adminModel.findOneAndUpdate({ email }, { password: user.password }),
    ]);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    // First, find the user to determine their role/collection
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    // Update in the correct collection based on role
    let user: UserDocument | null = null;

    if (existingUser.role === Role.THERAPIST) {
      user = (await this.therapistModel.findByIdAndUpdate(
        userId,
        updateUserDto,
        {
          new: true,
        },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.CAREGIVER) {
      user = (await this.caregiverModel.findByIdAndUpdate(
        userId,
        updateUserDto,
        {
          new: true,
        },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.ADMIN) {
      user = (await this.adminModel.findByIdAndUpdate(userId, updateUserDto, {
        new: true,
      })) as unknown as UserDocument;
    } else {
      user = await this.userModel.findByIdAndUpdate(userId, updateUserDto, {
        new: true,
      });
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateOnboardingStatus(
    userId: string,
    status: boolean,
  ): Promise<UserDocument> {
    // First, find the user to determine their role/collection
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    // Update in the correct collection based on role
    let user: UserDocument | null = null;

    if (existingUser.role === Role.THERAPIST) {
      user = (await this.therapistModel.findByIdAndUpdate(
        userId,
        { onboardingCompleted: status },
        { new: true },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.CAREGIVER) {
      user = (await this.caregiverModel.findByIdAndUpdate(
        userId,
        { onboardingCompleted: status },
        { new: true },
      )) as unknown as UserDocument;
    } else if (existingUser.role === Role.ADMIN) {
      user = (await this.adminModel.findByIdAndUpdate(
        userId,
        { onboardingCompleted: status },
        { new: true },
      )) as unknown as UserDocument;
    } else {
      user = await this.userModel.findByIdAndUpdate(
        userId,
        { onboardingCompleted: status },
        { new: true },
      );
    }

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }
  async countUsers(filter: any): Promise<number> {
    return this.userModel.countDocuments(filter);
  }
}
