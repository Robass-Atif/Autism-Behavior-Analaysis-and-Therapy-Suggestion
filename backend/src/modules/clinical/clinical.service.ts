import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { TherapyGoal } from "../therapy-goals/schemas/therapy-goal.schema";

import { VideoSession } from "./schemas/video-session.schema";
import { CreateTherapyGoalDto } from "./dto/create-therapy-goal.dto";
import { UpdateTherapyGoalDto } from "./dto/update-therapy-goal.dto";
import { CreateVideoSessionDto } from "./dto/create-video-session.dto";
import { Patient } from "../patients/schemas/patient.schema";
import { PatientCaregiver } from "../patients/schemas/patient-caregiver.schema";
import { PatientsService } from "../patients/patients.service";
import { PdfGeneratorService } from "./services/pdf-generator.service";
import { AiAnalysisService } from "./services/ai-analysis.service";
import { Role } from "../../common/enums/role.enum";
import { EmailService } from "../email/email.service";
import { CryptoService } from "../../common/services/crypto.service";
import { User, UserDocument } from "../users/schemas/user.schema";
import * as fs from "fs";
import * as path from "path";
@Injectable()
export class ClinicalService {
  constructor(
    @InjectModel(TherapyGoal.name) private therapyGoalModel: Model<TherapyGoal>,
    @InjectModel(VideoSession.name)
    private videoSessionModel: Model<VideoSession>,
    @Inject(forwardRef(() => PatientsService))
    private patientsService: PatientsService,
    private pdfGeneratorService: PdfGeneratorService,
    private aiAnalysisService: AiAnalysisService,
    private emailService: EmailService,
    private cryptoService: CryptoService,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(PatientCaregiver.name) private patientCaregiverModel: Model<PatientCaregiver>,
  ) {}

  // ========== THERAPY GOALS ==========

  async createTherapyGoal(therapistId: string, dto: CreateTherapyGoalDto) {
    const goal = new this.therapyGoalModel({
      ...dto,
      therapistId: new Types.ObjectId(therapistId),
      patientId: new Types.ObjectId(dto.patientId),
      status: "active",
      progress: dto.progress || 0,
      deleted: false,
    });

    await goal.save();

    // Recalculate patient progress after creating goal
    await this.patientsService.calculatePatientProgress(dto.patientId);

    return {
      success: true,
      message: "Therapy goal created successfully",
      goal: this.formatGoal(goal),
    };
  }

  async getTherapyGoals(userId: string, userRole: string, patientId?: string) {
    const query: any = {
      deleted: false,
    };

    if (userRole === Role.THERAPIST) {
      query.therapistId = userId;
    } else if (userRole === Role.PATIENT) {
      const profile = await this.patientsService.getPatientProfile(userId);
      query.patientId = profile.id;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    const goals = await this.therapyGoalModel
      .find(query)
      .populate("patientId", "fullName mrn")
      .sort({ createdAt: -1 })
      .exec();

    return {
      goals: goals.map((g) => this.formatGoal(g)),
      total: goals.length,
    };
  }

  async getTherapyGoalById(goalId: string, userId: string, userRole: string) {
    const goal = await this.therapyGoalModel
      .findById(goalId)
      .populate("patientId", "fullName mrn")
      .exec();

    if (!goal || goal.deleted) {
      throw new NotFoundException("Therapy goal not found");
    }

    // Access control
    if (userRole === "therapist" && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException(
        "You can only access your own therapy goals",
      );
    }

    return this.formatGoal(goal);
  }

  async updateTherapyGoal(
    goalId: string,
    userId: string,
    userRole: string,
    updateData: UpdateTherapyGoalDto,
  ) {
    const goal = await this.therapyGoalModel.findById(goalId);

    if (!goal || goal.deleted) {
      throw new NotFoundException("Therapy goal not found");
    }

    // Access control
    if (userRole === "therapist" && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException(
        "You can only update your own therapy goals",
      );
    }

    Object.assign(goal, updateData);
    goal.updatedAt = new Date();

    await goal.save();

    // Recalculate patient progress if status changed
    if (updateData.status) {
      await this.patientsService.calculatePatientProgress(
        goal.patientId.toString(),
      );
    }

    return {
      success: true,
      message: "Therapy goal updated successfully",
      goal: this.formatGoal(goal),
    };
  }

  async deleteTherapyGoal(goalId: string, userId: string, userRole: string) {
    const goal = await this.therapyGoalModel.findById(goalId);

    if (!goal || goal.deleted) {
      throw new NotFoundException("Therapy goal not found");
    }

    // Access control
    if (userRole === "therapist" && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException(
        "You can only delete your own therapy goals",
      );
    }

    goal.deleted = true;
    goal.updatedAt = new Date();

    await goal.save();

    // Recalculate patient progress after deleting goal
    await this.patientsService.calculatePatientProgress(
      goal.patientId.toString(),
    );

    return {
      success: true,
      message: "Therapy goal deleted successfully",
    };
  }

  // ========== VIDEO SESSIONS ==========

  async createVideoSession(
    userId: string,
    userRole: string,
    dto: CreateVideoSessionDto,
    videoUrl: string,
    encryptionKeyPattern?: string,
    encryptionIV?: string,
    encryptionAuthTag?: string
  ) {
    const sessionData: any = {
      ...dto,
      duration: parseFloat(dto.duration as any) || 0,
      videoUrl,
      encryptionKeyPattern,
      encryptionIV,
      encryptionAuthTag,
      status: "pending_review", // Always starts as pending_review
      uploadedBy: userRole === "caregiver" ? "caregiver" : "therapist",
      reviewed: false,
      deleted: false,
      recordedAt: dto.recordedAt || new Date(),
    };

    // Set therapistId or caregiverId based on role
    if (userRole === "caregiver") {
      sessionData.caregiverId = userId;

      // Link to patient's therapist
      const patient = await this.patientsService.findByIdInternal(
        dto.patientId,
      );
      if (!patient || patient.deleted) {
        throw new NotFoundException("Patient not found");
      }
      sessionData.therapistId = patient.therapistId;
    } else {
      sessionData.therapistId = userId;
    }

    const session = new this.videoSessionModel(sessionData);
    await session.save();

    return {
      success: true,
      message:
        "Video session uploaded successfully. Awaiting therapist review.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== STREAM DECRYPTED VIDEO ==========
  async streamDecryptedVideo(videoUrl: string, res: any) {
    // 1. Find the session by URL to get encryption bounds
    const session = await this.videoSessionModel.findOne({ videoUrl });
    if (!session || session.deleted) {
      throw new NotFoundException("Video not found");
    }

    const baseDir = path.join(__dirname, "..", "..", "..");
    // videoUrl is something like /uploads/videos/video-xxx.webm
    // The relative path from project root is just the URL without leading slash
    const filepath = path.join(baseDir, videoUrl.replace(/^\//, ""));

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException("Physical video file not found on disk");
    }

    // 2. Determine if it's encrypted
    if (session.encryptionKeyPattern && session.encryptionIV && session.encryptionAuthTag) {
      // It is encrypted, decrypt on the fly
      try {
        const fileKey = this.cryptoService.decryptFileKey(session.encryptionKeyPattern);
        const iv = Buffer.from(session.encryptionIV, "base64");
        const authTag = Buffer.from(session.encryptionAuthTag, "base64");

        const decryptStream = this.cryptoService.createDecryptStream(fileKey, iv, authTag);
        const readStream = fs.createReadStream(filepath);

        // Required headers for video streaming
        res.setHeader("Content-Type", "video/webm"); // Or dynamically determined by ext

        // Pipe: File Stream -> Decrypt Stream -> Response Stream
        readStream.pipe(decryptStream).pipe(res);

        readStream.on("error", (err) => {
          console.error("Error reading encrypted video stream", err);
          if (!res.headersSent) res.status(500).send("Error reading video stream");
        });

        decryptStream.on("error", (err) => {
          console.error("Error decrypting video stream", err);
          if (!res.headersSent) res.status(500).send("Error decrypting video stream");
        });
      } catch (err) {
        console.error("Decryption key error:", err);
        throw new BadRequestException("Failed to unlock video file");
      }
    } else {
      // Fallback for older plaintext videos
      res.setHeader("Content-Type", "video/webm");
      const readStream = fs.createReadStream(filepath);
      readStream.pipe(res);
    }
  }

  // ========== NEW: APPROVE FOR AI ==========

  async approveForAI(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId && session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only approve your own sessions");
    }

    if (session.status !== "pending_review") {
      throw new BadRequestException(
        `Cannot approve session with status "${session.status}". Session must be in "pending_review" status.`,
      );
    }

    session.status = "approved_for_ai";
    session.updatedAt = new Date();
    await session.save();

    return {
      success: true,
      message:
        "Session approved for AI analysis. You can now trigger analysis.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== NEW: SUBMIT THERAPIST REVIEW ==========

  async submitTherapistReview(
    sessionId: string,
    therapistId: string,
    reviewData: {
      overrideSeverity?: number;
      reviewNotes?: string;
      therapyPlanAdjustments?: string;
    },
  ) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only review your own sessions");
    }

    if (session.status !== "completed") {
      throw new BadRequestException(
        `Cannot review session with status "${session.status}". Session must be in "completed" status.`,
      );
    }

    const originalAISeverity = session.ensemblePrediction?.severity ?? null;
    const isOverridden =
      reviewData.overrideSeverity !== undefined &&
      reviewData.overrideSeverity !== null &&
      reviewData.overrideSeverity !== originalAISeverity;

    session.therapistReview = {
      overrideSeverity: isOverridden
        ? reviewData.overrideSeverity
        : (originalAISeverity ?? 0),
      originalAISeverity: originalAISeverity ?? 0,
      isOverridden,
      reviewNotes: reviewData.reviewNotes || "",
      therapyPlanAdjustments: reviewData.therapyPlanAdjustments || "",
      reviewedAt: new Date(),
      reviewedBy: therapistId as any,
      overriddenAt: isOverridden ? new Date() : undefined,
    };

    session.therapistNotes = reviewData.reviewNotes || session.therapistNotes;
    session.reviewed = true;
    session.reviewedAt = new Date();
    session.status = "therapist_review";
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: "Therapist review submitted successfully.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== NEW: PUBLISH REPORT ==========

  async publishReport(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only publish your own sessions");
    }

    if (
      session.status !== "therapist_review" &&
      session.status !== "completed"
    ) {
      throw new BadRequestException(
        `Cannot publish session with status "${session.status}". Session must be in "therapist_review" or "completed" status.`,
      );
    }

    session.status = "published";
    session.publishedAt = new Date();
    session.publishedBy = therapistId as any;
    session.updatedAt = new Date();

    await session.save();

    // Send email to caregiver with PDF report
    try {
      const patient = await this.patientsService.getPatientById(
        session.patientId.toString(),
        therapistId,
        "therapist",
      );

      if (patient) {
        // Find caregiver email
        const caregiverId =
          (patient as any)?.caregiverId || session.caregiverId;

        // We do a lookup to find the caregiver's actual email
        // using the patient's existing populated data or fallback to patient user.
        // Or if patient doc has caregiverEmail (it might not), we will look up the User by caregiverId.
        const UserModule = require("mongoose").model("User");
        let caregiverEmail =
          (session as any).caregiverEmail || (patient as any)?.caregiverEmail;
        let caregiverName = "Caregiver";

        if (!caregiverEmail && caregiverId) {
          const caregiverUser = await UserModule.findById(caregiverId).lean();
          if (caregiverUser) {
            caregiverEmail = caregiverUser.email;
            caregiverName = caregiverUser.fullName || "Caregiver";
          }
        }

        if (caregiverEmail) {
          // Generate PDF
          const pdfBuffer = await this.generatePatientPDF(
            session.patientId.toString(),
            therapistId,
            {
              patientId: session.patientId.toString(),
              sessionId: session._id.toString(),
              includeCharts: true,
              includeTables: false,
              includeGoals: false,
              includeNotes: true,
              watermark: true,
              reportType: "session",
            },
            "therapist",
          );

          await this.emailService.sendPublishedReportEmail(
            caregiverEmail,
            caregiverName,
            patient.fullName,
            pdfBuffer,
            {
              sessionId: session._id.toString(),
              actionType: session.actionType || "Video Session",
              recordedAt: session.recordedAt,
              publishedAt: session.publishedAt,
              severity:
                session.therapistReview?.isOverridden &&
                session.therapistReview?.overrideSeverity != null
                  ? session.therapistReview.overrideSeverity
                  : session.ensemblePrediction?.severity,
            },
          );
        }
      }
    } catch (e) {
      console.error("Failed to email caregiver on publish:", e);
    }

    return {
      success: true,
      message:
        "Report published successfully. Caregiver can now view the results.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== VIDEO SESSION QUERIES ==========

  async getVideoSessions(
    userId: string,
    userRole: string,
    patientId?: string,
    actionType?: string,
  ) {
    const query: any = {
      deleted: false,
    };

    if (userRole === "therapist") {
      query.therapistId = userId;
    } else if (userRole === "caregiver") {
      const result = await this.patientsService.getCaregiverPatients(userId);
      const patientIds = (result.patients || []).map((p: any) => p.id);

      const caregiverIdsToMatch: any[] = [userId];
      try {
        if (Types.ObjectId.isValid(userId)) {
          caregiverIdsToMatch.push(new Types.ObjectId(userId));
        }
      } catch (e) {}

      if (patientId) {
        if (
          !patientIds.includes(patientId.toString()) &&
          !patientIds.some((id) => id && id.toString() === patientId.toString())
        ) {
          query.patientId = null; // Unauthorized to view this patient
        } else {
          query.patientId = patientId;
        }
      } else {
        query.$or = [
          { patientId: { $in: patientIds } },
          { caregiverId: { $in: caregiverIdsToMatch } },
        ];
      }
    } else if (userRole === "patient") {
      const profile = await this.patientsService.getPatientProfile(userId);
      query.patientId = profile.id;
    }

    if (patientId && userRole !== "caregiver") {
      // Add patientId filter without removing the role-based therapistId filter
      query.patientId = patientId;
    }

    if (actionType) {
      query.actionType = actionType;
    }

    const sessions = await this.videoSessionModel
      .find(query)
      .populate("patientId", "fullName mrn")
      .populate("caregiverId", "fullName email")
      .sort({ recordedAt: -1 })
      .limit(50)
      .exec();

    return {
      sessions: sessions.map((s) => this.formatVideoSession(s, userRole)),
      total: sessions.length,
    };
  }

  async getVideoSessionById(
    sessionId: string,
    userId: string,
    userRole: string,
  ) {
    const session = await this.videoSessionModel
      .findById(sessionId)
      .populate("patientId", "fullName mrn")
      .populate("therapistId", "fullName email")
      .populate("caregiverId", "fullName email")
      .exec();

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    // Access control
    const sessionTherapistId =
      session.therapistId?._id?.toString() || session.therapistId?.toString();
    if (userRole === "therapist") {
      // Allow access if therapist owns the session OR if session has no therapist
      // (orphaned sessions from caregiver uploads before fix)
      if (sessionTherapistId && sessionTherapistId !== userId) {
        throw new ForbiddenException(
          "You can only access your own video sessions",
        );
      }
      // If therapistId is null, check if therapist owns the patient
      if (!sessionTherapistId) {
        const patientId =
          session.patientId?._id?.toString() || session.patientId?.toString();
        if (patientId) {
          try {
            await this.patientsService.getPatientById(
              patientId,
              userId,
              "therapist",
            );
            // Repair: set the missing therapistId on the session
            await this.videoSessionModel.findByIdAndUpdate(sessionId, {
              therapistId: userId,
            });
          } catch {
            throw new ForbiddenException(
              "You can only access your own video sessions",
            );
          }
        }
      }
    }

    if (userRole === "caregiver") {
      // Caregiver can access sessions for any of their linked patients
      const result = await this.patientsService.getCaregiverPatients(userId);
      const patientIds = (result.patients || []).map((p: any) =>
        p.id?.toString(),
      );
      const sessionPatientId =
        session.patientId?._id?.toString() || session.patientId?.toString();
      if (!patientIds.includes(sessionPatientId)) {
        throw new ForbiddenException(
          "You can only access sessions for your linked patients",
        );
      }
    }

    return this.formatVideoSession(session, userRole);
  }

  async updateVideoSession(
    sessionId: string,
    userId: string,
    userRole: string,
    updateData: any,
  ) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    // Access control
    if (userRole === "therapist" && session.therapistId.toString() !== userId) {
      throw new ForbiddenException(
        "You can only update your own video sessions",
      );
    }

    Object.assign(session, updateData);
    session.updatedAt = new Date();

    // Backwards compatibility patch for older sessions that were saved as 'analyzed' before strict schema enums
    if ((session.status as string) === "analyzed") {
      session.status = "completed";
    }

    await session.save();

    return {
      success: true,
      message: "Video session updated successfully",
      session: this.formatVideoSession(session),
    };
  }

  async deleteVideoSession(
    sessionId: string,
    userId: string,
    userRole: string,
  ) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    // Access control
    if (userRole === "therapist" && session.therapistId.toString() !== userId) {
      throw new ForbiddenException(
        "You can only delete your own video sessions",
      );
    }

    if (userRole === "caregiver") {
      const result = await this.patientsService.getCaregiverPatients(userId);
      const patientIds = (result.patients || []).map((p: any) =>
        p.id?.toString(),
      );
      const sessionPatientId =
        session.patientId?._id?.toString() || session.patientId?.toString();
      if (!patientIds.includes(sessionPatientId)) {
        throw new ForbiddenException(
          "You can only delete sessions for your linked patients",
        );
      }
    }

    session.deleted = true;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: "Video session deleted successfully",
    };
  }

  async unpublishPatientClinicalReport(patientId: string, userId: string, userRole: string) {
    const patient = await this.patientModel.findById(patientId);

    if (!patient || patient.deleted) {
      throw new NotFoundException("Patient not found");
    }

    // Access control: Only linked caregivers or their therapist can unpublish
    if (userRole === "caregiver") {
      const result = await this.patientsService.getCaregiverPatients(userId);
      const patientIds = (result.patients || []).map((p: any) => p.id?.toString());
      if (!patientIds.includes(patientId)) {
        throw new ForbiddenException("You can only unpublish reports for your linked patients");
      }
    } else if (userRole === "therapist") {
      if (patient.therapistId.toString() !== userId) {
        throw new ForbiddenException("You can only unpublish reports for your own patients");
      }
    }

    patient.isLatestClinicalReportPublished = false;
    patient.updatedAt = new Date();
    await patient.save();

    return {
      success: true,
      message: "Clinical report unpublished successfully",
    };
  }

  // ========== AI ANALYSIS ==========

  async triggerAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId && session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only analyze your own sessions");
    }

    // Enforce: can only trigger AI on approved or failed sessions
    if (session.status !== "approved_for_ai" && session.status !== "failed") {
      throw new BadRequestException(
        `Cannot trigger AI analysis on session with status "${session.status}". Session must be in "approved_for_ai" or "failed" status.`,
      );
    }

    // Update session status to processing
    session.status = "processing";
    await session.save();

    // Call the dedicated AI Analysis service
    this.aiAnalysisService.analyzeVideo(sessionId).catch((error) => {
      console.error(
        `AI Analysis Service error for session ${sessionId}:`,
        error,
      );
    });

    return {
      success: true,
      message:
        "AI analysis has been triggered. Results will be available shortly.",
      sessionId: session._id,
      status: "processing",
    };
  }

  // ========== CANCEL AI ANALYSIS ==========

  async cancelAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId && session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only cancel your own sessions");
    }

    if (
      session.status !== "processing" &&
      session.status !== "approved_for_ai" &&
      session.status !== "failed"
    ) {
      throw new BadRequestException(
        `Cannot cancel session with status "${session.status}". Session must be in "processing", "approved_for_ai", or "failed" status.`,
      );
    }

    session.status = "approved_for_ai";
    session.cancelledAt = new Date();
    session.cancelledBy = therapistId as any;
    session.lastError = undefined as any;
    session.retryCount = 0;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: "AI analysis cancelled. Session returned to approved status.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== RETRY AI ANALYSIS ==========

  async retryAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId && session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException("You can only retry your own sessions");
    }

    if (session.status !== "failed") {
      throw new BadRequestException(
        `Cannot retry session with status "${session.status}". Session must be in "failed" status.`,
      );
    }

    // Reset to approved_for_ai so it can be triggered again
    session.status = "approved_for_ai";
    session.retryCount = 0;
    session.lastError = undefined as any;
    session.cancelledAt = undefined as any;
    session.cancelledBy = undefined as any;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message:
        "Session reset for retry. You can now trigger AI analysis again.",
      session: this.formatVideoSession(session),
    };
  }

  // ========== THERAPY RECOMMENDATION (ON-DEMAND) ==========

  async generateTherapyRecommendation(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException("Video session not found");
    }

    if (session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException(
        "You can only generate recommendations for your own sessions",
      );
    }

    if (!session.ensemblePrediction) {
      throw new BadRequestException(
        "No AI prediction data available for this session. Please perform AI analysis first.",
      );
    }

    // Call the dedicated AI Analysis service to generate RAG-based therapy recommendations
    const clinicalReport = await this.aiAnalysisService.generateTherapyRecommendation(
      sessionId,
    );

    session.clinicalReport = clinicalReport;
    session.updatedAt = new Date();
    await session.save();

    return {
      success: true,
      message: "Therapy recommendations generated successfully.",
      sessionId: session._id,
      clinicalReport,
    };
  }

  async generatePatientTherapyRecommendation(
    patientId: string,
    therapistId: string,
  ) {
    const patient = await this.patientModel.findById(patientId);
    if (!patient || patient.deleted) {
      throw new NotFoundException("Patient not found");
    }

    if (patient.therapistId.toString() !== therapistId) {
      throw new ForbiddenException(
        "You can only generate recommendations for your own patients",
      );
    }

    // Call the dedicated AI Analysis service to generate RAG-based therapy recommendations
    const clinicalReport = await this.aiAnalysisService.fetchAggregatedTherapyRecommendation(
      patientId,
    );

    patient.latestClinicalReport = clinicalReport;
    patient.updatedAt = new Date();
    await patient.save();

    return {
      success: true,
      message: "Aggregated therapy recommendations generated successfully.",
      patientId: patient._id,
      clinicalReport,
    };
  }

  async updatePatientClinicalReport(
    patientId: string,
    therapistId: string,
    clinicalReport: any,
  ) {
    const patient = await this.patientModel.findById(patientId);
    if (!patient || patient.deleted) {
      throw new NotFoundException("Patient not found");
    }

    if (patient.therapistId.toString() !== therapistId) {
      throw new ForbiddenException(
        "You can only update reports for your own patients",
      );
    }

    patient.latestClinicalReport = clinicalReport;
    patient.updatedAt = new Date();
    await patient.save();

    return {
      success: true,
      message: "Clinical report updated successfully.",
      patientId: patient._id,
    };
  }

  async publishPatientClinicalReport(patientId: string, therapistId: string) {
    const patient = await this.patientModel.findById(patientId);
    if (!patient || patient.deleted) {
      throw new NotFoundException("Patient not found");
    }

    if (patient.therapistId.toString() !== therapistId) {
      throw new ForbiddenException(
        "You can only publish reports for your own patients",
      );
    }

    if (!patient.latestClinicalReport) {
      throw new BadRequestException(
        "No clinical report found to publish. Please generate a recommendation first.",
      );
    }

    patient.isLatestClinicalReportPublished = true;
    patient.latestClinicalReportPublishedAt = new Date();
    await patient.save();

    // Send email to caregiver with Aggregated PDF report
    try {
      console.log(`[PublishReport] Looking for caregiver for patient ${patientId}`);
      let caregiverId = (patient as any)?.caregiverId;
      let caregiverEmail = (patient as any)?.caregiverEmail;
      let caregiverName = "Caregiver";

      console.log(`[PublishReport] Initial: caregiverId=${caregiverId}, caregiverEmail=${caregiverEmail}`);

      // 1. Try PatientCaregiver links
      if (!caregiverId || !caregiverEmail) {
        console.log(`[PublishReport] Checking PatientCaregiver links for ${patientId}`);
        const link = await this.patientCaregiverModel.findOne({
          $or: [
            { patientId: patient._id },
            { patientId: patient._id.toString() }
          ],
          status: "active"
        }).exec();
        
        if (link) {
          caregiverId = link.caregiverId;
          console.log(`[PublishReport] Link found! link.caregiverId=${caregiverId} (Type: ${typeof caregiverId})`);
        } else {
          console.log(`[PublishReport] No PatientCaregiver link found.`);
        }
      }

      // 2. Try Caregiver model assignedPatients (Fallback)
      if (!caregiverId || !caregiverEmail) {
        console.log(`[PublishReport] Checking Caregiver model assignedPatients for ${patientId}`);
        try {
          const CaregiverModel = this.patientModel.db.model("Caregiver");
          const caregiverObj: any = await CaregiverModel.findOne({
            $or: [
              { assignedPatients: patient._id },
              { assignedPatients: patient._id.toString() }
            ],
            accountStatus: 'active'
          }).lean().exec();

          if (caregiverObj) {
            caregiverId = caregiverObj._id || caregiverObj.id;
            caregiverEmail = caregiverObj.email;
            caregiverName = caregiverObj.fullName || "Caregiver";
            console.log(`[PublishReport] Caregiver found via assignedPatients! email=${caregiverEmail}`);
          } else {
            console.log(`[PublishReport] No Caregiver found via assignedPatients.`);
          }
        } catch (modelErr) {
          console.warn(`[PublishReport] Caregiver model lookup failed: ${modelErr.message}`);
        }
      }

      // 3. Resolve Email if we have ID but no Email
      if (!caregiverEmail && caregiverId) {
        console.log(`[PublishReport] Resolving email for caregiverId=${caregiverId}`);
        let caregiverUser = await this.userModel.findById(caregiverId).lean();
        
        if (!caregiverUser) {
           // Try Caregiver model explicitly
           try {
              const CaregiverModel = this.patientModel.db.model("Caregiver");
              caregiverUser = await CaregiverModel.findById(caregiverId).lean().exec() as any;
           } catch (e) {}
        }

        if (caregiverUser) {
          caregiverEmail = (caregiverUser as any).email;
          caregiverName = (caregiverUser as any).fullName || "Caregiver";
          console.log(`[PublishReport] Resolved Email: ${caregiverEmail}`);
        } else {
          console.log(`[PublishReport] Could not resolve caregiver user for ID: ${caregiverId}`);
        }
      }

      if (caregiverEmail) {
        const pdfBuffer = await this.generatePatientPDF(
          patientId,
          therapistId,
          {
            patientId,
            includeCharts: true,
            includeTables: true,
            includeGoals: true,
            includeNotes: true,
            watermark: true,
            reportType: "aggregated_outcome",
          },
          "therapist",
        );

        await this.emailService.sendPublishedReportEmail(
          caregiverEmail,
          caregiverName,
          patient.fullName,
          pdfBuffer,
          {
            actionType: "Aggregated Clinical Report",
            recordedAt: new Date(),
            publishedAt: patient.latestClinicalReportPublishedAt,
            severity: patient.latestClinicalReport?.therapy_metadata?.severity_level || 1,
          },
        );
      } else {
        console.log(`[PublishReport] CRITICAL: No caregiver email found. Notification skipped.`);
      }
    } catch (e) {
      console.error("[PublishReport] Failed to notify caregiver:", e);
    }

    return {
      success: true,
      message: "Clinical report published successfully for caregiver access.",
      patientId: patient._id,
      publishedAt: patient.latestClinicalReportPublishedAt,
    };
  }

  async resendPatientClinicalReport(patientId: string, therapistId: string) {
    const patient = await this.patientModel.findById(patientId);
    if (!patient || patient.deleted) {
      throw new NotFoundException("Patient not found");
    }

    if (patient.therapistId.toString() !== therapistId) {
      throw new ForbiddenException(
        "You can only resend reports for your own patients",
      );
    }

    if (!patient.latestClinicalReport) {
      throw new BadRequestException(
        "No clinical report found to resend. Please generate a recommendation first.",
      );
    }

    if (!patient.isLatestClinicalReportPublished) {
      throw new BadRequestException(
        "Report must be published before it can be resent. Use the Send to Caregiver option first.",
      );
    }

    // Send email to caregiver with Aggregated PDF report
    try {
      console.log(`[ResendReport] Looking for caregiver for patient ${patientId}`);
      let caregiverId = (patient as any)?.caregiverId;
      let caregiverEmail = (patient as any)?.caregiverEmail;
      let caregiverName = "Caregiver";

      console.log(`[ResendReport] Initial: caregiverId=${caregiverId}, caregiverEmail=${caregiverEmail}`);

      // 1. Try PatientCaregiver links
      if (!caregiverId || !caregiverEmail) {
        console.log(`[ResendReport] Checking PatientCaregiver links for ${patientId}`);
        const link = await this.patientCaregiverModel.findOne({
          $or: [
            { patientId: patient._id },
            { patientId: patient._id.toString() }
          ],
          status: "active"
        }).exec();
        
        if (link) {
          caregiverId = link.caregiverId;
          console.log(`[ResendReport] Link found! link.caregiverId=${caregiverId} (Type: ${typeof caregiverId})`);
        } else {
          console.log(`[ResendReport] No PatientCaregiver link found.`);
        }
      }

      // 2. Try Caregiver model assignedPatients (Fallback)
      if (!caregiverId || !caregiverEmail) {
        console.log(`[ResendReport] Checking Caregiver model assignedPatients for ${patientId}`);
        try {
          const CaregiverModel = this.patientModel.db.model("Caregiver");
          const caregiverObj: any = await CaregiverModel.findOne({
            $or: [
              { assignedPatients: patient._id },
              { assignedPatients: patient._id.toString() }
            ],
            accountStatus: 'active'
          }).lean().exec();

          if (caregiverObj) {
            caregiverId = caregiverObj._id || caregiverObj.id;
            caregiverEmail = caregiverObj.email;
            caregiverName = caregiverObj.fullName || "Caregiver";
            console.log(`[ResendReport] Caregiver found via assignedPatients! email=${caregiverEmail}`);
          } else {
            console.log(`[ResendReport] No Caregiver found via assignedPatients.`);
          }
        } catch (modelErr) {
          console.warn(`[ResendReport] Caregiver model lookup failed: ${modelErr.message}`);
        }
      }

      // 3. Resolve Email if we have ID but no Email
      if (!caregiverEmail && caregiverId) {
        console.log(`[ResendReport] Resolving email for caregiverId=${caregiverId}`);
        let caregiverUser = await this.userModel.findById(caregiverId).lean();
        
        if (!caregiverUser) {
           // Try Caregiver model explicitly
           try {
              const CaregiverModel = this.patientModel.db.model("Caregiver");
              caregiverUser = await CaregiverModel.findById(caregiverId).lean().exec() as any;
           } catch (e) {}
        }

        if (caregiverUser) {
          caregiverEmail = (caregiverUser as any).email;
          caregiverName = (caregiverUser as any).fullName || "Caregiver";
          console.log(`[ResendReport] Resolved Email: ${caregiverEmail}`);
        } else {
          console.log(`[ResendReport] Could not resolve caregiver user for ID: ${caregiverId}`);
        }
      }

      if (caregiverEmail) {
        const pdfBuffer = await this.generatePatientPDF(
          patientId,
          therapistId,
          {
            patientId,
            includeCharts: true,
            includeTables: true,
            includeGoals: true,
            includeNotes: true,
            watermark: true,
            reportType: "aggregated_outcome",
          },
          "therapist",
        );

        await this.emailService.sendPublishedReportEmail(
          caregiverEmail,
          caregiverName,
          patient.fullName,
          pdfBuffer,
          {
            actionType: "Aggregated Clinical Report (Resend)",
            recordedAt: new Date(),
            publishedAt: patient.latestClinicalReportPublishedAt,
            severity: patient.latestClinicalReport?.therapy_metadata?.severity_level || 1,
          },
        );
      } else {
        throw new BadRequestException("No caregiver email found for this patient.");
      }
    } catch (e) {
      console.error("[ResendReport] Failed to resend email to caregiver:", e);
      throw new BadRequestException(`Failed to resend report: ${e.message}`);
    }

    return {
      success: true,
      message: "Clinical report resent successfully to caregiver.",
      patientId: patient._id,
      resentAt: new Date(),
    };
  }

  // ========== LONGITUDINAL DATA ==========

  async getPatientLongitudinal(patientId: string, therapistId: string) {
    // 1. Verify that this therapist has access to the patient
    // This will throw a ForbiddenException if access is denied
    try {
      await this.patientsService.getPatientById(
        patientId,
        therapistId,
        "therapist",
      );
    } catch (err) {
      // If therapist doesn't own patient, check if they own any sessions for this patient as fallback
      const hasSession = await this.videoSessionModel.findOne({
        patientId,
        therapistId,
      });
      if (!hasSession) throw err;
    }

    const sessions = await this.videoSessionModel
      .find({
        $or: [
          { patientId: patientId },
          { patientId: new Types.ObjectId(patientId) },
        ],
        therapistId,
        deleted: false,
        status: {
          $in: [
            "completed",
            "therapist_review",
            "published",
            "failed",
            "analyzed",
            "processing",
          ],
        },
        ensemblePrediction: { $exists: true, $ne: null },
      })
      .select(
        "recordedAt actionType status ensemblePrediction therapistReview clinicalReport createdAt",
      )
      .sort({ recordedAt: 1 })
      .exec();

    // Build longitudinal trend data from ensemble predictions only
    const trendData = sessions.map((s: any) => {
      const ep = s.ensemblePrediction || {};
      const review = s.therapistReview || {};
      return {
        sessionId: s._id,
        date: s.recordedAt,
        actionType: s.actionType,
        status: s.status,
        severity: review.isOverridden ? review.overrideSeverity : ep.severity,
        aiSeverity: ep.severity,
        isOverridden: review.isOverridden || false,
        social_affect: ep.social_affect,
        rrb: ep.rrb,
        comparison_score: ep.comparison_score,
        severity_confidence: ep.severity_confidence,
        comparison_confidence: ep.comparison_confidence,
      };
    });

    return {
      patientId,
      totalSessions: sessions.length,
      trendData,
    };
  }

  // ========== HELPER METHODS ==========

  private formatGoal(goal: any) {
    return {
      id: goal._id,
      patientId: goal.patientId?._id || goal.patientId,
      patientName: goal.patientId?.fullName,
      patientMrn: goal.patientId?.mrn,
      title: goal.title,
      category: goal.category,
      description: goal.description,
      status: goal.status,
      progress: goal.progress,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      priority: goal.priority,
      notes: goal.notes,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private formatVideoSession(session: any, requesterRole?: string) {
    const base: any = {
      id: session._id,
      patientId: session.patientId?._id || session.patientId,
      patientName: session.patientId?.fullName,
      caregiverId: session.caregiverId?._id || session.caregiverId,
      caregiverName: session.caregiverId?.fullName,
      caregiverEmail: session.caregiverId?.email,
      videoUrl: session.videoUrl,
      thumbnailUrl: session.thumbnailUrl,
      recordedAt: session.recordedAt,
      duration: session.duration,
      actionType: session.actionType,
      qualityScore: session.qualityScore,
      status: session.status,
      uploadedBy: session.uploadedBy,
      therapistNotes: session.therapistNotes,
      reviewed: session.reviewed,
      reviewedAt: session.reviewedAt,
      createdAt: session.createdAt,
    };

    // CAREGIVER visibility: only show AI results when published
    if (requesterRole === "caregiver") {
      if (session.status === "published") {
        base.aiConfidence = session.aiConfidence;
        base.ensemblePrediction = session.ensemblePrediction;
        base.clinicalReport = session.clinicalReport;
        base.therapistReview = session.therapistReview;
        base.publishedAt = session.publishedAt;
      }
      // Caregivers never see raw prediction data or model transparency
      return base;
    }

    // THERAPIST / ADMIN: full access
    base.aiConfidence = session.aiConfidence;
    base.aiAnalysis = session.aiAnalysis;
    base.rawPredictionResponse = session.rawPredictionResponse;
    base.ensemblePrediction = session.ensemblePrediction;
    base.clinicalReport = session.clinicalReport;
    base.therapistReview = session.therapistReview;
    base.publishedAt = session.publishedAt;
    base.publishedBy = session.publishedBy;

    // Retry & Cancel tracking
    base.retryCount = session.retryCount;
    base.maxRetries = session.maxRetries;
    base.lastError = session.lastError;
    base.cancelledAt = session.cancelledAt;

    return base;
  }

  // ========== PDF GENERATION ==========

  async generatePatientPDF(
    patientId: string,
    userId: string,
    options: any,
    userRole: string = "therapist",
  ): Promise<Buffer> {
    const sessionId = options?.sessionId as string | undefined;

    // Fetch patient data
    const patient = await this.patientsService.getPatientById(
      patientId,
      userId,
      userRole,
    );

    // Fetch goals
    const goalsData = await this.therapyGoalModel
      .find({ patientId, deleted: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Fetch sessions
    const sessionQuery: any = { patientId, deleted: false };
    if (sessionId) {
      sessionQuery._id = sessionId;
    }

    const resolvedReportType =
      options?.reportType || (sessionId ? "session" : "individual");
    const sessionLimit =
      sessionId || resolvedReportType === "session"
        ? 1
        : resolvedReportType === "progress"
          ? 30
          : resolvedReportType === "consolidated"
            ? 100
            : 20;

    const sessionsData = await this.videoSessionModel
      .find(sessionQuery)
      .sort({ recordedAt: -1 })
      .limit(sessionLimit)
      .lean()
      .exec();

    if (sessionId && sessionsData.length === 0) {
      throw new NotFoundException(
        "Requested session was not found for this patient",
      );
    }

    // Convert patient to plain object
    const patientObj =
      typeof patient.toObject === "function" ? patient.toObject() : patient;

    // Resolve therapist name robustly (works for populated objects and raw ids).
    const therapistRef: any = patientObj.therapistId;
    const inlineTherapistName =
      typeof therapistRef === "object"
        ? therapistRef?.fullName || therapistRef?.name
        : null;
    const therapistLookupId =
      typeof therapistRef === "object"
        ? therapistRef?._id || therapistRef?.id || therapistRef?.userId
        : therapistRef;

    let therapistName =
      inlineTherapistName ||
      (await this.patientsService.getTherapistName(
        therapistLookupId?.toString(),
      ));

    if (!therapistName || therapistName === "Unknown Therapist") {
      const fallbackTherapistId = sessionsData.find(
        (s: any) => s.therapistId,
      )?.therapistId;
      if (fallbackTherapistId) {
        therapistName = await this.patientsService.getTherapistName(
          fallbackTherapistId.toString(),
        );
      }
    }

    const patientData = {
      ...patientObj,
      therapistName,
      // We purposefully DO NOT concatenate all therapistNotes into one giant string
      // because they are already printed individually in the sessions section.
      notes: null,
      reportSession: sessionId ? sessionsData[0] : null,
    };

    const resolvedOptions = {
      ...options,
      reportType: resolvedReportType,
    };

    // Generate PDF
    return this.pdfGeneratorService.generatePatientReport(
      patientData,
      goalsData,
      sessionsData,
      resolvedOptions,
    );
  }
}

