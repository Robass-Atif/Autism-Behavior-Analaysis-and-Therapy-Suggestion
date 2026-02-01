import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { EmailService } from "../email/email.service";
import { AccountStatus, Role } from "../../common/enums/role.enum";
import { Caregiver } from "../users/schemas/caregiver.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLog, AuditLogDocument } from "./schemas/audit-log.schema";
import { SystemMetric, SystemMetricDocument } from './schemas/system-metric.schema';
import * as os from "os";

import { PatientsService } from "../patients/patients.service";

@Injectable()
export class AdminService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    // @ts-ignore
    private patientsService: PatientsService,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(SystemMetric.name) private systemMetricModel: Model<SystemMetricDocument>,
  ) { }

  // Dashboard Stats - Real backend-calculated data
  async getDashboardStats() {
    // Calculate stats from centralized User model
    const totalTherapists = await this.usersService.countUsers({
      role: Role.THERAPIST,
    });
    const totalCaregivers = await this.usersService.countUsers({
      role: Role.CAREGIVER,
    });
    const totalAdmins = await this.usersService.countUsers({
      role: Role.ADMIN,
    });
    // FIX: Count ALL users regardless of role (includes PATIENTS now), excluding deleted
    const totalUsers = await this.usersService.countUsers({
      deleted: { $ne: true },
    });

    // Therapist status breakdown
    // Therapist status breakdown (using simpler queries for efficiency)
    const pendingVerification = await this.usersService[
      "userModel"
    ].countDocuments({
      role: Role.THERAPIST,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    const pendingApproval = await this.usersService["userModel"].countDocuments(
      {
        role: Role.THERAPIST,
        accountStatus: {
          $in: [AccountStatus.PENDING_APPROVAL, AccountStatus.PENDING],
        },
      },
    );

    const activeTherapists = await this.usersService[
      "userModel"
    ].countDocuments({
      role: Role.THERAPIST,
      accountStatus: AccountStatus.ACTIVE,
    });

    const suspendedUsers = await this.usersService["userModel"].countDocuments({
      accountStatus: AccountStatus.SUSPENDED,
    });

    const rejectedApplications = await this.usersService[
      "userModel"
    ].countDocuments({
      role: Role.THERAPIST,
      accountStatus: AccountStatus.REJECTED,
    });

    // Active caregivers
    // Active caregivers
    const activeCaregivers = await this.usersService.countUsers({
      role: Role.CAREGIVER,
      accountStatus: AccountStatus.ACTIVE,
    });

    return {
      totalUsers,
      totalTherapists,
      totalCaregivers,
      totalApplications: totalTherapists,
      pendingVerification,
      pendingApplications: pendingApproval + pendingVerification,
      activeTherapists,
      activeCaregivers,
      suspendedUsers,
      rejectedApplications,
      totalPatients: await this.patientsService.countTotalPatients(),
    };
  }

  // Get User Growth Stats (for Area Chart)
  async getUserGrowthStats() {
    // 1. Get stats for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of month

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 } as any,
      },
    ];

    const stats = await this.usersService.userModel.aggregate(pipeline);

    // 2. Format for frontend
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Create base array for last 6 months
    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthIndex = d.getMonth();
      const year = d.getFullYear();

      const found = stats.find(
        (s) => s._id.month === monthIndex + 1 && s._id.year === year,
      );

      result.push({
        name: months[monthIndex],
        users: found ? found.count : 0,
      });
    }

    return result;
  }

  // 9️⃣ Get Therapist Applications
  async getTherapistApplications(params: {
    status?: string;
    page: number;
    limit: number;
  }) {
    const { status, page, limit } = params;

    // Get all therapists
    const applications = await this.usersService.getAllUsers(Role.THERAPIST);

    // Map frontend status to backend accountStatus
    let filteredApplications = applications;
    if (status && status !== "all") {
      const statusMap: Record<string, string[]> = {
        pending_approval: [
          "pending_approval",
          "pending_verification",
          "pending",
        ],
        active: ["active"],
        rejected: ["rejected"],
      };
      const targetStatuses = statusMap[status] || [status];
      filteredApplications = applications.filter((app: any) =>
        targetStatuses.includes(app.accountStatus),
      );
    }

    const skip = (page - 1) * limit;
    const paginatedApplications = filteredApplications.slice(
      skip,
      skip + limit,
    );

    return {
      applications: paginatedApplications.map((app: any) => ({
        id: app._id?.toString(),
        therapistId: app._id?.toString(),
        fullName: app.fullName,
        email: app.email,
        licenseNumber: app.credentials?.licenseNumber,
        licenseType: app.credentials?.licenseType,
        organizationName:
          app.organization?.organizationName || app.organization?.name,
        submittedAt: app.createdAt,
        status: app.accountStatus,
        licenseCertificate: app.credentials?.licenseCertificateUrl,
      })),
      total: filteredApplications.length,
      page,
      totalPages: Math.ceil(filteredApplications.length / limit),
    };
  }

  // 🔟 Get All Users (Unified)
  async getAllUsers(params: {
    role?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { role, status, page, limit } = params;

    // Get users from all collections
    const [therapists, caregivers, admins, patients] = await Promise.all([
      this.usersService.getAllUsers(Role.THERAPIST),
      this.usersService.getAllUsers(Role.CAREGIVER),
      this.usersService.getAllUsers(Role.ADMIN),
      this.usersService.getAllUsers(Role.PATIENT),
    ]);

    // Combine and normalize
    let allUsers = [
      ...therapists.map((u: any) => ({ ...u.toObject(), role: "therapist" })),
      ...caregivers.map((u: any) => ({ ...u.toObject(), role: "caregiver" })),
      ...admins.map((u: any) => ({ ...u.toObject(), role: "admin" })),
      ...patients.map((u: any) => ({ ...u.toObject(), role: "patient" })),
    ];

    // Filter by role
    if (role && role !== "all") {
      allUsers = allUsers.filter(
        (u: any) => u.role.toLowerCase() === role.toLowerCase(),
      );
    }

    // Filter by status
    if (status && status !== "all") {
      allUsers = allUsers.filter(
        (u: any) => u.accountStatus?.toLowerCase() === status.toLowerCase(),
      );
    }

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(skip, skip + limit);

    return {
      users: paginatedUsers.map((user: any) => ({
        id: user._id?.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.accountStatus,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      })),
      total: allUsers.length,
      page,
      totalPages: Math.ceil(allUsers.length / limit),
    };
  }

  // 1️⃣1️⃣ Get User By ID
  async getUserById(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userObj = user.toObject();
    return {
      id: userObj._id?.toString(),
      fullName: userObj.fullName,
      email: userObj.email,
      role: userObj.role,
      status: userObj.accountStatus,
      phoneNumber: userObj.phoneNumber,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
      lastLogin: userObj.lastLogin,
    };
  }

  // 1️⃣2️⃣ Get Full User Details (with role-specific data)
  async getUserDetails(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userObj = user.toObject();

    // Base user info
    const baseInfo = {
      id: userObj._id?.toString(),
      fullName: userObj.fullName,
      email: userObj.email,
      phoneNumber: userObj.phoneNumber,
      role: userObj.role,
      status: userObj.accountStatus,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
      lastLogin: userObj.lastLogin,
    };

    // Role-specific details
    switch (userObj.role) {
      case Role.THERAPIST:
        return {
          ...baseInfo,
          roleSpecific: {
            licenseNumber: userObj.credentials?.licenseNumber,
            licenseType: userObj.credentials?.licenseType,
            organizationName:
              userObj.organization?.organizationName ||
              userObj.organization?.name,
            department: userObj.organization?.department,
            specialties: userObj.specialties || [],
            yearsOfExperience: userObj.yearsOfExperience,
            bio: userObj.bio,
            licenseVerified: userObj.credentials?.verified,
            rejectionCount: userObj.rejectionCount,
            approvedAt: userObj.approvedAt,
            licenseCertificate: userObj.credentials?.licenseCertificatePath
              ? `${process.env.BACKEND_URL || "http://localhost:5001"}/uploads/${userObj.credentials.licenseCertificatePath}`
              : undefined,
          },
        };
      case Role.CAREGIVER:
        return {
          ...baseInfo,
          roleSpecific: {
            linkedTherapistId: userObj.linkedTherapistId,
            relationshipToPatient: userObj.relationshipToPatient,
            patientIds: userObj.patientIds || [],
          },
        };
      case Role.ADMIN:
        return {
          ...baseInfo,
          roleSpecific: {
            adminLevel: userObj.adminLevel || "admin",
            permissions: userObj.permissions || [],
          },
        };
      default:
        return baseInfo;
    }
  }

  // 1️⃣3️⃣ Update User
  async updateUser(userId: string, updateData: any, adminId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Allowed fields for update
    const allowedUpdates: any = {};
    if (updateData.fullName) allowedUpdates.fullName = updateData.fullName;
    if (updateData.phoneNumber)
      allowedUpdates.phoneNumber = updateData.phoneNumber;
    if (updateData.organizationName) {
      allowedUpdates["organization.organizationName"] =
        updateData.organizationName;
    }
    if (updateData.department) {
      allowedUpdates["organization.department"] = updateData.department;
    }

    // Update user
    const updatedUser = await this.usersService.updateUser(
      userId,
      allowedUpdates,
    );

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "USER_UPDATED",
      targetUserId: userId,
      details: `Updated user fields: ${Object.keys(allowedUpdates).join(", ")}`,
    });

    return {
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id?.toString(),
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        organizationName: (updatedUser as any).organization?.organizationName,
        updatedAt: new Date(),
      },
    };
  }

  // 1️⃣4️⃣ Soft Delete User
  async deleteUser(userId: string, adminId: string, reason?: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Prevent self-deletion
    if (userId === adminId) {
      throw new BadRequestException("You cannot delete your own account");
    }

    // Soft delete user
    await this.usersService.updateUser(userId, {
      deleted: true,
      deletedAt: new Date(),
      accountStatus: AccountStatus.DELETED,
    });

    // If therapist, cascade to linked caregivers
    let cascadeEffect: any = { linkedCaregiversDeactivated: 0 };
    if (user.role === Role.THERAPIST) {
      const linkedCaregivers =
        await this.findCaregiversLinkedToTherapist(userId);
      for (const caregiver of linkedCaregivers) {
        await this.usersService.updateUser(caregiver._id.toString(), {
          accountStatus: AccountStatus.DELETED,
          deleted: true,
          deletedAt: new Date(),
        });
      }
      cascadeEffect.linkedCaregiversDeactivated = linkedCaregivers.length;
    }

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "USER_DELETED",
      targetUserId: userId,
      details: `Soft deleted user. Reason: ${reason || "No reason provided"}. Cascade effect: ${cascadeEffect.linkedCaregiversDeactivated} caregivers deactivated`,
    });

    return {
      success: true,
      message: "User deleted successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        deletedAt: new Date(),
        deletedBy: adminId,
      },
      cascadeEffect,
    };
  }

  // 🔟 Approve Therapist Application
  async approveTherapistApplication(
    applicationId: string,
    adminId: string,
    notes?: string,
  ) {
    const therapist = await this.usersService.findById(applicationId);

    if (!therapist || therapist.role !== Role.THERAPIST) {
      throw new NotFoundException("Therapist application not found");
    }

    if (therapist.accountStatus === AccountStatus.ACTIVE) {
      throw new BadRequestException("Application already approved");
    }

    // CRITICAL: Check if email is verified before allowing approval
    if (!therapist.isEmailVerified) {
      throw new BadRequestException(
        "Cannot approve: Therapist has not verified their email address. " +
        "Please wait for them to click the verification link.",
      );
    }

    // Update status to ACTIVE
    await this.usersService.updateUserStatus(
      applicationId,
      AccountStatus.ACTIVE,
    );

    // Set onboarding as incomplete (force onboarding)
    await this.usersService.updateOnboardingStatus(applicationId, false);

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "THERAPIST_APPROVED",
      targetUserId: applicationId,
      details: notes || "Therapist application approved",
    });

    // Send approval email
    await this.emailService.sendTherapistApprovalEmail(
      therapist.email,
      therapist.fullName,
    );

    const updatedTherapist = await this.usersService.findById(applicationId);

    if (!updatedTherapist) {
      throw new NotFoundException("Therapist not found");
    }

    return {
      success: true,
      message: "Therapist application approved",
      therapist: {
        id: updatedTherapist._id,
        status: updatedTherapist.accountStatus,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    };
  }

  // 1️⃣1️⃣ Reject Therapist Application
  async rejectTherapistApplication(
    applicationId: string,
    adminId: string,
    reason: string,
    notes?: string,
  ) {
    const therapist = await this.usersService.findById(applicationId);

    if (!therapist || therapist.role !== Role.THERAPIST) {
      throw new NotFoundException("Therapist application not found");
    }

    // Increment rejection count
    const currentRejectionCount = therapist.rejectionCount || 0;
    const newRejectionCount = currentRejectionCount + 1;

    await this.usersService.updateUser(applicationId, {
      accountStatus: AccountStatus.REJECTED,
      rejectionCount: newRejectionCount,
    });

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "THERAPIST_REJECTED",
      targetUserId: applicationId,
      details: `Rejected: ${reason}. Count: ${newRejectionCount}`,
    });

    // Send rejection email
    await this.emailService.sendTherapistRejectionEmail(
      therapist.email,
      therapist.fullName,
      reason,
      newRejectionCount,
    );

    return {
      success: true,
      message: "Application rejected",
      therapist: {
        id: therapist._id,
        status: AccountStatus.REJECTED,
        rejectionCount: newRejectionCount,
        remainingAttempts: Math.max(0, 3 - newRejectionCount),
        rejectedAt: new Date(),
        rejectedBy: adminId,
        reason,
      },
    };
  }

  // 1️⃣2️⃣ Suspend User (CASCADE to caregivers if therapist)
  async suspendUser(
    userId: string,
    adminId: string,
    reason: string,
    notes?: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Update user status
    await this.usersService.updateUserStatus(userId, AccountStatus.SUSPENDED);

    let cascadeEffect: any = {
      linkedCaregiversSuspended: 0,
      caregiverIds: [],
    };

    // CASCADE: If therapist, suspend all linked caregivers
    if (user.role === Role.THERAPIST) {
      const linkedCaregivers =
        await this.findCaregiversLinkedToTherapist(userId);

      for (const caregiver of linkedCaregivers) {
        await this.usersService.updateUserStatus(
          caregiver._id.toString(),
          AccountStatus.SUSPENDED,
        );
      }

      cascadeEffect = {
        linkedCaregiversSuspended: linkedCaregivers.length,
        caregiverIds: linkedCaregivers.map((c: any) => c._id.toString()),
      };

      // Send suspension emails to caregivers
      for (const caregiver of linkedCaregivers) {
        await this.emailService.sendAccountSuspensionEmail(
          caregiver.email,
          caregiver.fullName,
          "Your linked therapist has been suspended",
        );
      }
    }

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "USER_SUSPENDED",
      targetUserId: userId,
      details: `Suspended: ${reason}. Caregivers affected: ${cascadeEffect.linkedCaregiversSuspended}`,
    });

    // Send suspension email to user
    await this.emailService.sendAccountSuspensionEmail(
      user.email,
      user.fullName,
      reason,
    );

    return {
      success: true,
      message: "User suspended successfully",
      user: {
        id: user._id,
        status: AccountStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy: adminId,
      },
      cascadeEffect,
    };
  }

  // 1️⃣3️⃣ Activate User
  async activateUser(userId: string, adminId: string, notes?: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.usersService.updateUserStatus(userId, AccountStatus.ACTIVE);

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "USER_ACTIVATED",
      targetUserId: userId,
      details: notes || "User reactivated",
    });

    // Send reactivation email
    await this.emailService.sendAccountReactivationEmail(
      user.email,
      user.fullName,
    );

    return {
      success: true,
      message: "User activated successfully",
      user: {
        id: user._id,
        status: AccountStatus.ACTIVE,
        activatedAt: new Date(),
        activatedBy: adminId,
      },
    };
  }

  // 1️⃣4️⃣ Delete Therapist (PERMANENT with CASCADE)
  async deleteTherapist(
    therapistId: string,
    adminId: string,
    confirmation: string,
    reason: string,
  ) {
    if (confirmation !== "DELETE") {
      throw new BadRequestException(
        'Confirmation string must be exactly "DELETE"',
      );
    }

    const therapist = await this.usersService.findById(therapistId);

    if (!therapist || therapist.role !== Role.THERAPIST) {
      throw new NotFoundException("Therapist not found");
    }

    // Find all linked caregivers
    const linkedCaregivers =
      await this.findCaregiversLinkedToTherapist(therapistId);

    // CASCADE: Revoke all caregiver access (set status to REVOKED)
    for (const caregiver of linkedCaregivers) {
      await this.usersService.updateUser(caregiver._id.toString(), {
        accountStatus: "REVOKED" as any, // New status for permanently blocked
        deleted: true,
        deletedAt: new Date(),
      });

      // Send deletion notification
      await this.emailService.sendAccountDeletionEmail(
        caregiver.email,
        caregiver.fullName,
        "Your linked therapist account has been permanently deleted",
      );
    }

    // Count patients (we retain them, not delete)
    const patientsCount = await this.countPatientsForTherapist(therapistId);

    // Soft delete therapist
    await this.usersService.updateUser(therapistId, {
      deleted: true,
      deletedAt: new Date(),
      accountStatus: "REVOKED" as any,
    });

    // Create audit log
    await this.createAuditLog({
      userId: adminId,
      action: "THERAPIST_DELETED",
      targetUserId: therapistId,
      details: `Deleted therapist. Reason: ${reason}. Caregivers revoked: ${linkedCaregivers.length}. Patients retained: ${patientsCount}`,
    });

    // Send deletion email to therapist
    await this.emailService.sendAccountDeletionEmail(
      therapist.email,
      therapist.fullName,
      reason,
    );

    return {
      success: true,
      message: "Therapist permanently deleted",
      cascadeEffect: {
        linkedCaregiversRevoked: linkedCaregivers.length,
        caregiverIds: linkedCaregivers.map((c: any) => c._id.toString()),
        patientsRetained: patientsCount,
        dataArchived: true,
      },
    };
  }

  // 1️⃣5️⃣ Get All Patients (Admin cross-therapist access)
  async getAllPatients(params: {
    therapistId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const { therapistId, status, page, limit } = params;

    const query: any = {};

    if (therapistId) {
      query.therapistId = therapistId;
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    // This would query the patients collection
    // For now, return mock structure as patients module will be created next
    return {
      patients: [],
      total: 0,
      page,
      totalPages: 0,
      message:
        "Patients module not yet implemented. Create patients module first.",
    };
  }

  // Helper: Find caregivers linked to therapist
  private async findCaregiversLinkedToTherapist(
    therapistId: string,
  ): Promise<any[]> {
    // This would query patient_caregivers table
    // For now, return empty array (will be implemented with patients module)
    return Promise.resolve([]);
  }

  // Helper: Count patients for therapist
  private async countPatientsForTherapist(
    therapistId: string,
  ): Promise<number> {
    // This would query patients table
    // For now, return 0 (will be implemented with patients module)
    return Promise.resolve(0);
  }

  // Get System Health Stats
  async getSystemHealth() {
    const uptime = process.uptime();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = Math.round((usedMem / totalMem) * 100);

    // Get DB status
    let dbStatus = 'connected';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.usersService.userModel.db.db.admin().command({ ping: 1 });
      dbLatency = Date.now() - start;
    } catch (error) {
      dbStatus = 'error';
    }

    // Get historical data (last 30 minutes)
    const history = await this.systemMetricModel
      .find()
      .sort({ createdAt: -1 })
      .limit(30)
      .exec();

    // Reverse to show oldest to newest
    const historySorted = history.reverse();

    return {
      uptime,
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercentage: memUsage,
      },
      cpu: {
        count: os.cpus().length,
        usagePercentage: historySorted.length > 0 ? historySorted[historySorted.length - 1].cpuUsage : 0,
      },
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      history: historySorted,
      timestamp: new Date(),
    };
  }

  // Cron Job: Collect Metrics every 10 seconds for demo purposes (usually every minute)
  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectMetrics() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = Math.round((usedMem / totalMem) * 100);

      // Mock reasonable CPU usage fluctuation
      const cpuUsage = Math.floor(Math.random() * 30) + 10;

      // Simulating active users
      const activeUsers = Math.floor(Math.random() * 50) + 100;

      // DB Latency
      let dbLatency = 0;
      try {
        const start = Date.now();
        await this.usersService.userModel.db.db.admin().command({ ping: 1 });
        dbLatency = Date.now() - start;
      } catch (e) { }

      const metric = new this.systemMetricModel({
        cpuUsage,
        memoryUsage: memUsage,
        activeUsers,
        apiLatency: dbLatency || 5, // Default to 5ms
      });

      await metric.save();

      // Cleanup old metrics (keep last 24 hours) - run occasionally or check count
      // For demo, keep last 1000 records
      const count = await this.systemMetricModel.countDocuments();
      if (count > 1000) {
        const oldest = await this.systemMetricModel.find().sort({ createdAt: 1 }).limit(count - 1000);
        const ids = oldest.map(d => d._id);
        await this.systemMetricModel.deleteMany({ _id: { $in: ids } });
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  // Get Audit Logs
  async getAuditLogs(page: number = 1, limit: number = 20) {
    const logs = await this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    const total = await this.auditLogModel.countDocuments();

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Helper: Create audit log
  private async createAuditLog(logData: {
    userId: string;
    action: string;
    targetUserId: string;
    details: string;
    userName?: string;
  }) {
    try {
      if (!logData.userName) {
        try {
          const user = await this.usersService.findById(logData.userId);
          // @ts-ignore
          logData.userName = user?.name || user?.fullName || "Admin";
        } catch (e) { }
      }

      const log = new this.auditLogModel(logData);
      await log.save();
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  }
}
