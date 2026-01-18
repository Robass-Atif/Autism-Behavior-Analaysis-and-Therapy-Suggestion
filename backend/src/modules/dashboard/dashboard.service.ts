import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from '../patients/schemas/patient.schema';
import { User } from '../users/schemas/user.schema';
import { Therapist } from '../users/schemas/therapist.schema';
import { Caregiver } from '../users/schemas/caregiver.schema';
import { Admin } from '../users/schemas/admin.schema';
import { TherapyGoal } from '../clinical/schemas/therapy-goal.schema';
import { VideoSession } from '../clinical/schemas/video-session.schema';
import { Invitation } from '../invitation/schemas/invitation.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Therapist.name) private therapistModel: Model<Therapist>,
    @InjectModel(Caregiver.name) private caregiverModel: Model<Caregiver>,
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(TherapyGoal.name) private therapyGoalModel: Model<TherapyGoal>,
    @InjectModel(VideoSession.name) private videoSessionModel: Model<VideoSession>,
    @InjectModel(Invitation.name) private invitationModel: Model<Invitation>,
  ) { }

  async getTherapistStats(therapistId: string) {
    const [
      totalPatients,
      activePatients,
      pendingReviews,
      totalGoals,
      activeGoals,
      achievedGoals,
      totalSessions,
    ] = await Promise.all([
      this.patientModel.countDocuments({ therapistId, deleted: false }),
      this.patientModel.countDocuments({ therapistId, status: 'active', deleted: false }),
      this.videoSessionModel.countDocuments({ therapistId, status: 'analyzed', reviewed: false }),
      this.therapyGoalModel.countDocuments({ therapistId, deleted: false }),
      this.therapyGoalModel.countDocuments({ therapistId, status: 'active', deleted: false }),
      this.therapyGoalModel.countDocuments({ therapistId, status: { $in: ['achieved', 'completed'] }, deleted: false }),
      this.videoSessionModel.countDocuments({ therapistId, deleted: false }),
    ]);

    // Calculate average progress
    const patients = await this.patientModel
      .find({ therapistId, deleted: false })
      .select('progressScore')
      .exec();

    const avgProgress = patients.length > 0
      ? patients.reduce((sum, p) => sum + (p.progressScore || 0), 0) / patients.length
      : 0;

    // Generate weekly sessions data (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weeklySessions = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const sessionCount = await this.videoSessionModel.countDocuments({
        therapistId,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        deleted: false,
      });

      weeklySessions.push({
        day: days[dayStart.getDay()],
        sessions: sessionCount,
        date: dayStart.toISOString().split('T')[0],
      });
    }

    // Generate progress trend (last 4 weeks)
    const progressTrend = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (w * 7));

      // Simulate weekly progress based on goals achieved ratio
      const weekGoals = await this.therapyGoalModel.countDocuments({
        therapistId,
        updatedAt: { $gte: weekStart, $lte: weekEnd },
        deleted: false,
      });

      const weekAchieved = await this.therapyGoalModel.countDocuments({
        therapistId,
        status: { $in: ['achieved', 'completed'] },
        updatedAt: { $gte: weekStart, $lte: weekEnd },
        deleted: false,
      });

      const weekProgress = weekGoals > 0 ? Math.round((weekAchieved / weekGoals) * 100) : 0;

      progressTrend.push({
        week: `W${4 - w}`,
        progress: weekProgress,
        goals: weekGoals,
      });
    }

    return {
      totalPatients,
      activePatients,
      inactivePatients: totalPatients - activePatients,
      pendingReviews,
      reportsGenerated: totalSessions,
      avgProgress: Math.round(avgProgress),
      totalGoals,
      activeGoals,
      achievedGoals,
      totalSessions,
      pendingSessions: await this.videoSessionModel.countDocuments({
        therapistId,
        status: { $in: ['uploaded', 'processing'] }
      }),
      // Chart data
      weeklySessions,
      progressTrend,
      goalAchievementRate: totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0,
    };
  }

  async getCaregiverStats(caregiverId: string) {
    const [
      linkedPatients,
      uploadedVideos,
      pendingReviews,
      completedReports,
    ] = await Promise.all([
      this.patientModel.countDocuments({
        _id: { $in: await this.getLinkedPatientIds(caregiverId) },
        deleted: false
      }),
      this.videoSessionModel.countDocuments({ caregiverId, deleted: false }),
      this.videoSessionModel.countDocuments({ caregiverId, reviewed: false }),
      this.videoSessionModel.countDocuments({ caregiverId, reviewed: true }),
    ]);

    return {
      linkedPatients,
      uploadedVideos,
      pendingReviews,
      completedReports,
      scheduledSessions: 0, // Would need separate scheduling schema
    };
  }

  async getAdminStats() {
    const [
      totalAdmins,
      totalTherapists,
      activeTherapists,
      pendingTherapists,
      totalCaregivers,
      activeCaregivers,
      totalPatients,
      pendingApplications,
      rejectedTherapists,
      suspendedTherapists,
      suspendedCaregivers,
      totalInvitations,
      pendingInvitations,
    ] = await Promise.all([
      // Count admins
      this.adminModel.countDocuments({}),
      // Count therapists
      this.therapistModel.countDocuments({}),
      this.therapistModel.countDocuments({ accountStatus: 'active' }),
      this.therapistModel.countDocuments({
        accountStatus: { $in: ['pending_approval', 'pending_verification', 'pending'] }
      }),
      // Count caregivers
      this.caregiverModel.countDocuments({}),
      this.caregiverModel.countDocuments({ accountStatus: 'active' }),
      // Count patients
      this.patientModel.countDocuments({ deleted: false }),
      // Applications (pending therapists)
      this.therapistModel.countDocuments({
        accountStatus: { $in: ['pending_approval', 'pending_verification', 'pending'] }
      }),
      // Rejected therapists
      this.therapistModel.countDocuments({ accountStatus: 'rejected' }),
      // Suspended users (all roles)
      this.therapistModel.countDocuments({ accountStatus: 'suspended' }),
      this.caregiverModel.countDocuments({ accountStatus: 'suspended' }),
      // Invitations
      this.invitationModel.countDocuments({}),
      this.invitationModel.countDocuments({ status: 'pending' }),
    ]);

    const totalSuspended = suspendedTherapists + suspendedCaregivers;

    return {
      totalUsers: totalAdmins + totalTherapists + totalCaregivers,
      totalTherapists,
      activeTherapists,
      pendingTherapists,
      totalCaregivers,
      activeCaregivers,
      totalPatients,
      totalApplications: totalTherapists,
      pendingApplications,
      rejectedApplications: rejectedTherapists,
      suspendedUsers: totalSuspended,
      totalInvitations,
      pendingInvitations,
    };
  }

  private async getLinkedPatientIds(caregiverId: string): Promise<string[]> {
    // This would query the patient-caregiver linking table
    // For now, return empty array - would need proper implementation
    return [];
  }
}
