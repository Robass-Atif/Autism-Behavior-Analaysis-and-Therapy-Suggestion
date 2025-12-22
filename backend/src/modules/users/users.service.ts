import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Therapist, TherapistDocument } from './schemas/therapist.schema';
import { Caregiver, CaregiverDocument } from './schemas/caregiver.schema';
import { Admin, AdminDocument } from './schemas/admin.schema';
import { Role, AccountStatus } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Therapist.name) private therapistModel: Model<TherapistDocument>,
    @InjectModel(Caregiver.name) private caregiverModel: Model<CaregiverDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async findById(id: string): Promise<UserDocument | null> {
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

  async createTherapist(data: Partial<Therapist>): Promise<TherapistDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const therapist = new this.therapistModel({
      ...data,
      email: data.email.toLowerCase(),
      role: Role.THERAPIST,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    return therapist.save();
  }

  async createCaregiver(data: Partial<Caregiver>): Promise<CaregiverDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const caregiver = new this.caregiverModel({
      ...data,
      email: data.email.toLowerCase(),
      role: Role.CAREGIVER,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    return caregiver.save();
  }

  async createAdmin(data: Partial<Admin>): Promise<AdminDocument> {
    const exists = await this.emailExists(data.email);
    if (exists) {
      throw new ConflictException('Email already registered');
    }

    const admin = new this.adminModel({
      ...data,
      email: data.email.toLowerCase(),
      role: Role.ADMIN,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    return admin.save();
  }

  async verifyEmail(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    // Update account status based on role
    if (user.role === Role.THERAPIST) {
      user.accountStatus = AccountStatus.PENDING_APPROVAL;
    } else if (user.role === Role.CAREGIVER) {
      user.accountStatus = AccountStatus.ACTIVE;
    } else if (user.role === Role.ADMIN) {
      user.accountStatus = AccountStatus.PENDING_APPROVAL;
    }

    return user.save();
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });
  }

  async findByVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });
  }

  async getAllUsers(role?: Role): Promise<UserDocument[]> {
    const query = role ? { role } : {};
    return this.userModel.find(query).select('-password');
  }

  async getPendingApprovals(): Promise<UserDocument[]> {
    return this.userModel
      .find({ accountStatus: AccountStatus.PENDING_APPROVAL })
      .select('-password');
  }

  async approveUser(
    userId: string,
    approvedBy: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.accountStatus = AccountStatus.ACTIVE;

    if (user.role === Role.THERAPIST) {
      await this.therapistModel.findByIdAndUpdate(userId, {
        isAdminApproved: true,
        adminApprovalDate: new Date(),
        adminApprovalBy: approvedBy,
      });
    } else if (user.role === Role.ADMIN) {
      await this.adminModel.findByIdAndUpdate(userId, {
        isApproved: true,
        approvalDate: new Date(),
        approvedBy: new Types.ObjectId(approvedBy),
      });
    }

    return user.save();
  }

  async rejectUser(
    userId: string,
    reason: string,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
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
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { accountStatus: status },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(userId);
    if (!result) {
      throw new NotFoundException('User not found');
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
      throw new NotFoundException('Caregiver not found');
    }

    return caregiver;
  }

  async getCaregiversByTherapist(therapistId: string): Promise<CaregiverDocument[]> {
    return this.caregiverModel.find({ invitedBy: new Types.ObjectId(therapistId) });
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
    return this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }
}
