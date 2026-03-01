import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Patient } from "../patients/schemas/patient.schema";
import { PatientCaregiver } from "../patients/schemas/patient-caregiver.schema";
import { User } from "../users/schemas/user.schema";

import { Therapist } from "../users/schemas/therapist.schema";
import { Caregiver } from "../users/schemas/caregiver.schema";
import { Admin } from "../users/schemas/admin.schema";
import { TherapyGoal } from "../therapy-goals/schemas/therapy-goal.schema";
import { VideoSession } from "../clinical/schemas/video-session.schema";
import { Invitation } from "../invitation/schemas/invitation.schema";

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(PatientCaregiver.name)
    private patientCaregiverModel: Model<PatientCaregiver>,
    @InjectModel(User.name) private userModel: Model<User>,

    @InjectModel(Therapist.name) private therapistModel: Model<Therapist>,
    @InjectModel(Caregiver.name) private caregiverModel: Model<Caregiver>,
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(TherapyGoal.name) private therapyGoalModel: Model<TherapyGoal>,
    @InjectModel(VideoSession.name)
    private videoSessionModel: Model<VideoSession>,
    @InjectModel(Invitation.name) private invitationModel: Model<Invitation>,
  ) {}

  async getTherapistStats(therapistId: string) {
    const tId = new Types.ObjectId(therapistId);

    const therapistQuery = { $in: [therapistId, tId] };

    const [
      totalPatients,
      activePatients,
      pendingReviews,
      totalGoals,
      activeGoals,
      achievedGoals,
      totalSessions,
    ] = await Promise.all([
      this.patientModel.countDocuments({
        therapistId: therapistQuery,
        deleted: false,
      }),
      this.patientModel.countDocuments({
        therapistId: therapistQuery,
        status: { $regex: /^active$/i },
        deleted: false,
      }),
      this.videoSessionModel.countDocuments({
        therapistId: therapistQuery,
        status: {
          $in: [
            "pending_review",
            "approved_for_ai",
            "processing",
            "completed",
            "failed",
          ],
        },
        deleted: false,
      }),
      this.therapyGoalModel.countDocuments({
        therapistId: therapistQuery,
        deleted: false,
      }),
      this.therapyGoalModel.countDocuments({
        therapistId: therapistQuery,
        status: "active",
        deleted: false,
      }),
      this.therapyGoalModel.countDocuments({
        therapistId: therapistQuery,
        status: { $in: ["achieved", "completed"] },
        deleted: false,
      }),
      this.videoSessionModel.countDocuments({
        therapistId: therapistQuery,
        deleted: false,
      }),
    ]);

    // Calculate average progress
    const patients = await this.patientModel
      .find({ therapistId: therapistQuery, deleted: false })
      .select("progressScore")
      .exec();

    const avgProgress =
      patients.length > 0
        ? patients.reduce((sum, p) => sum + (p.progressScore || 0), 0) /
          patients.length
        : 0;

    // Generate weekly sessions data (last 7 days)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const weeklySessions = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const sessionCount = await this.videoSessionModel.countDocuments({
        therapistId: therapistQuery,
        createdAt: { $gte: dayStart, $lte: dayEnd },
        deleted: false,
      });

      weeklySessions.push({
        day: days[dayStart.getDay()],
        sessions: sessionCount,
        date: dayStart.toISOString().split("T")[0],
      });
    }

    // Generate progress trend (last 4 weeks)
    const progressTrend = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - w * 7);

      // Simulate weekly progress based on goals achieved ratio
      const weekGoals = await this.therapyGoalModel.countDocuments({
        therapistId: therapistQuery,
        updatedAt: { $gte: weekStart, $lte: weekEnd },
        deleted: false,
      });

      const weekAchieved = await this.therapyGoalModel.countDocuments({
        therapistId: therapistQuery,
        status: { $in: ["achieved", "completed"] },
        updatedAt: { $gte: weekStart, $lte: weekEnd },
        deleted: false,
      });

      const weekProgress =
        weekGoals > 0 ? Math.round((weekAchieved / weekGoals) * 100) : 0;

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
        therapistId: therapistQuery,
        status: {
          $in: ["uploaded", "processing", "pending_review", "approved_for_ai"],
        },
      }),

      // Chart data
      weeklySessions,
      progressTrend,
      goalAchievementRate:
        totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0,
    };
  }

  async getCaregiverStats(caregiverId: string) {
    const cId = new Types.ObjectId(caregiverId);
    const caregiverQuery = { $in: [caregiverId, cId] };
    const linkedPatientIds = await this.getLinkedPatientIds(caregiverId);

    const [linkedPatients, uploadedVideos, pendingReviews, completedReports] =
      await Promise.all([
        this.patientModel.countDocuments({
          _id: { $in: linkedPatientIds },
          deleted: false,
        }),
        this.videoSessionModel.countDocuments({
          caregiverId: caregiverQuery,
          deleted: false,
        }),
        this.videoSessionModel.countDocuments({
          caregiverId: caregiverQuery,
          status: {
            $in: [
              "pending_review",
              "approved_for_ai",
              "processing",
              "failed",
              "completed",
            ],
          },
          deleted: false,
        }),
        this.videoSessionModel.countDocuments({
          caregiverId: caregiverQuery,
          status: { $in: ["published", "therapist_review"] },
          deleted: false,
        }),
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
      this.userModel.countDocuments({ role: "admin" }),
      // Count therapists
      this.userModel.countDocuments({ role: "therapist" }),
      this.userModel.countDocuments({
        role: "therapist",
        accountStatus: "active",
      }),
      this.userModel.countDocuments({
        role: "therapist",
        accountStatus: {
          $in: ["pending_approval", "pending_verification", "pending"],
        },
      }),
      // Count caregivers
      this.userModel.countDocuments({ role: "caregiver" }),
      this.userModel.countDocuments({
        role: "caregiver",
        accountStatus: "active",
      }),
      // Count patients
      this.patientModel.countDocuments({ deleted: false }),
      // Applications (pending therapists)
      this.userModel.countDocuments({
        role: "therapist",
        accountStatus: {
          $in: ["pending_approval", "pending_verification", "pending"],
        },
      }),
      // Rejected therapists
      this.userModel.countDocuments({
        role: "therapist",
        accountStatus: "rejected",
      }),
      // Suspended therapists
      this.userModel.countDocuments({
        role: "therapist",
        accountStatus: "suspended",
      }),
      // Suspended caregivers
      this.userModel.countDocuments({
        role: "caregiver",
        accountStatus: "suspended",
      }),
      // Invitations
      this.invitationModel.countDocuments({}),
      this.invitationModel.countDocuments({ status: "pending" }),
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

  private async getLinkedPatientIds(
    caregiverId: string,
  ): Promise<Types.ObjectId[]> {
    const cId = new Types.ObjectId(caregiverId);
    const caregiverQuery = { $in: [caregiverId, cId] };
    const links = await this.patientCaregiverModel
      .find({
        caregiverId: caregiverQuery,
        status: { $regex: /^active$/i },
      })
      .select("patientId")
      .exec();

    return links.map((link) => link.patientId);
  }
}
