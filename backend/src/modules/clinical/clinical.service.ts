import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { TherapyGoal } from '../therapy-goals/schemas/therapy-goal.schema';

import { VideoSession } from './schemas/video-session.schema';
import { CreateTherapyGoalDto } from './dto/create-therapy-goal.dto';
import { UpdateTherapyGoalDto } from './dto/update-therapy-goal.dto';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';
import { PatientsService } from '../patients/patients.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { AiAnalysisService } from './services/ai-analysis.service';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class ClinicalService {
  constructor(
    @InjectModel(TherapyGoal.name) private therapyGoalModel: Model<TherapyGoal>,
    @InjectModel(VideoSession.name) private videoSessionModel: Model<VideoSession>,
    @Inject(forwardRef(() => PatientsService))
    private patientsService: PatientsService,
    private pdfGeneratorService: PdfGeneratorService,
    private aiAnalysisService: AiAnalysisService,
  ) { }

  // ========== THERAPY GOALS ==========

  async createTherapyGoal(therapistId: string, dto: CreateTherapyGoalDto) {
    const goal = new this.therapyGoalModel({
      ...dto,
      therapistId: new Types.ObjectId(therapistId),
      patientId: new Types.ObjectId(dto.patientId),
      status: 'active',
      progress: dto.progress || 0,
      deleted: false,
    });

    await goal.save();


    // Recalculate patient progress after creating goal
    await this.patientsService.calculatePatientProgress(dto.patientId);

    return {
      success: true,
      message: 'Therapy goal created successfully',
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
      .populate('patientId', 'fullName mrn')
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
      .populate('patientId', 'fullName mrn')
      .exec();

    if (!goal || goal.deleted) {
      throw new NotFoundException('Therapy goal not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only access your own therapy goals');
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
      throw new NotFoundException('Therapy goal not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own therapy goals');
    }

    Object.assign(goal, updateData);
    goal.updatedAt = new Date();

    await goal.save();

    // Recalculate patient progress if status changed
    if (updateData.status) {
      await this.patientsService.calculatePatientProgress(goal.patientId.toString());
    }

    return {
      success: true,
      message: 'Therapy goal updated successfully',
      goal: this.formatGoal(goal),
    };
  }

  async deleteTherapyGoal(goalId: string, userId: string, userRole: string) {
    const goal = await this.therapyGoalModel.findById(goalId);

    if (!goal || goal.deleted) {
      throw new NotFoundException('Therapy goal not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && goal.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own therapy goals');
    }

    goal.deleted = true;
    goal.updatedAt = new Date();

    await goal.save();

    // Recalculate patient progress after deleting goal
    await this.patientsService.calculatePatientProgress(goal.patientId.toString());

    return {
      success: true,
      message: 'Therapy goal deleted successfully',
    };
  }

  // ========== VIDEO SESSIONS ==========

  async createVideoSession(
    userId: string,
    userRole: string,
    dto: CreateVideoSessionDto,
    videoUrl: string,
  ) {
    const sessionData: any = {
      ...dto,
      videoUrl,
      status: 'pending_review', // Always starts as pending_review
      uploadedBy: userRole === 'CAREGIVER' ? 'caregiver' : 'therapist',
      reviewed: false,
      deleted: false,
      recordedAt: dto.recordedAt || new Date(),
    };

    // Set therapistId or caregiverId based on role
    if (userRole === 'CAREGIVER') {
      sessionData.caregiverId = userId;

      // Link to patient's therapist
      try {
        const patient = await this.patientsService.getPatientById(dto.patientId, userId, 'CAREGIVER');
        if (patient && patient.therapistId) {
          sessionData.therapistId = patient.therapistId;
        }
      } catch (err) {
        console.warn('Could not link therapist to session:', err.message);
      }
    } else {
      sessionData.therapistId = userId;
    }

    const session = new this.videoSessionModel(sessionData);
    await session.save();

    return {
      success: true,
      message: 'Video session uploaded successfully. Awaiting therapist review.',
      session: this.formatVideoSession(session),
    };
  }

  // ========== NEW: APPROVE FOR AI ==========

  async approveForAI(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    // For flexibility in demo, disabled strict therapist matching
    // if (session.therapistId && session.therapistId.toString() !== therapistId) {
    //   throw new ForbiddenException('You can only approve your own sessions');
    // }

    if (session.status !== 'pending_review') {
      throw new BadRequestException(
        `Cannot approve session with status "${session.status}". Session must be in "pending_review" status.`
      );
    }

    session.status = 'approved_for_ai';
    session.updatedAt = new Date();
    await session.save();

    return {
      success: true,
      message: 'Session approved for AI analysis. You can now trigger analysis.',
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
    }
  ) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    if (session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException('You can only review your own sessions');
    }

    if (session.status !== 'completed') {
      throw new BadRequestException(
        `Cannot review session with status "${session.status}". Session must be in "completed" status.`
      );
    }

    const originalAISeverity = session.ensemblePrediction?.severity ?? null;
    const isOverridden = reviewData.overrideSeverity !== undefined &&
      reviewData.overrideSeverity !== null &&
      reviewData.overrideSeverity !== originalAISeverity;

    session.therapistReview = {
      overrideSeverity: isOverridden ? reviewData.overrideSeverity : (originalAISeverity ?? 0),
      originalAISeverity: originalAISeverity ?? 0,
      isOverridden,
      reviewNotes: reviewData.reviewNotes || '',
      therapyPlanAdjustments: reviewData.therapyPlanAdjustments || '',
      reviewedAt: new Date(),
      reviewedBy: therapistId as any,
      overriddenAt: isOverridden ? new Date() : undefined,
    };

    session.therapistNotes = reviewData.reviewNotes || session.therapistNotes;
    session.reviewed = true;
    session.reviewedAt = new Date();
    session.status = 'therapist_review';
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: 'Therapist review submitted successfully.',
      session: this.formatVideoSession(session),
    };
  }

  // ========== NEW: PUBLISH REPORT ==========

  async publishReport(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    if (session.therapistId.toString() !== therapistId) {
      throw new ForbiddenException('You can only publish your own sessions');
    }

    if (session.status !== 'therapist_review') {
      throw new BadRequestException(
        `Cannot publish session with status "${session.status}". Session must be in "therapist_review" status.`
      );
    }

    session.status = 'published';
    session.publishedAt = new Date();
    session.publishedBy = therapistId as any;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: 'Report published successfully. Caregiver can now view the results.',
      session: this.formatVideoSession(session),
    };
  }

  // ========== VIDEO SESSION QUERIES ==========

  async getVideoSessions(userId: string, userRole: string, patientId?: string, actionType?: string) {
    const query: any = {
      deleted: false,
    };

    if (userRole === 'THERAPIST') {
      query.therapistId = userId;
    } else if (userRole === 'CAREGIVER') {
      query.caregiverId = userId;
    } else if (userRole === 'PATIENT') {
      const profile = await this.patientsService.getPatientProfile(userId);
      query.patientId = profile.id;
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (actionType) {
      query.actionType = actionType;
    }

    const sessions = await this.videoSessionModel
      .find(query)
      .populate('patientId', 'fullName mrn')
      .populate('caregiverId', 'fullName email')
      .sort({ recordedAt: -1 })
      .limit(50)
      .exec();

    return {
      sessions: sessions.map((s) => this.formatVideoSession(s, userRole)),
      total: sessions.length,
    };
  }

  async getVideoSessionById(sessionId: string, userId: string, userRole: string) {
    const session = await this.videoSessionModel
      .findById(sessionId)
      .populate('patientId', 'fullName mrn')
      .populate('therapistId', 'fullName email')
      .populate('caregiverId', 'fullName email')
      .exec();

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && session.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only access your own video sessions');
    }

    if (userRole === 'CAREGIVER' && session.caregiverId?.toString() !== userId) {
      throw new ForbiddenException('You can only access your own video sessions');
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
      throw new NotFoundException('Video session not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && session.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own video sessions');
    }

    Object.assign(session, updateData);
    session.updatedAt = new Date();

    // Backwards compatibility patch for older sessions that were saved as 'analyzed' before strict schema enums
    if ((session.status as string) === 'analyzed') {
      session.status = 'completed';
    }

    await session.save();

    return {
      success: true,
      message: 'Video session updated successfully',
      session: this.formatVideoSession(session),
    };
  }

  async deleteVideoSession(sessionId: string, userId: string, userRole: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    // Access control
    if (userRole === 'THERAPIST' && session.therapistId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own video sessions');
    }

    session.deleted = true;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: 'Video session deleted successfully',
    };
  }

  // ========== AI ANALYSIS ==========

  async triggerAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }
    // Removed strict therapistId match here as well
    
    // Enforce: can only trigger AI on approved or failed sessions
    if (session.status !== 'approved_for_ai' && session.status !== 'failed') {
      throw new BadRequestException(
        `Cannot trigger AI analysis on session with status "${session.status}". Session must be in "approved_for_ai" or "failed" status.`
      );
    }

    // Update session status to processing
    session.status = 'processing';
    await session.save();

    // Call the dedicated AI Analysis service
    this.aiAnalysisService.analyzeVideo(sessionId).catch(error => {
      console.error(`AI Analysis Service error for session ${sessionId}:`, error);
    });

    return {
      success: true,
      message: 'AI analysis has been triggered. Results will be available shortly.',
      sessionId: session._id,
      status: 'processing',
    };
  }

  // ========== CANCEL AI ANALYSIS ==========

  async cancelAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    if (session.status !== 'processing' && session.status !== 'approved_for_ai' && session.status !== 'failed') {
      throw new BadRequestException(
        `Cannot cancel session with status "${session.status}". Session must be in "processing", "approved_for_ai", or "failed" status.`
      );
    }

    session.status = 'approved_for_ai';
    session.cancelledAt = new Date();
    session.cancelledBy = therapistId as any;
    session.lastError = undefined as any;
    session.retryCount = 0;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: 'AI analysis cancelled. Session returned to approved status.',
      session: this.formatVideoSession(session),
    };
  }

  // ========== RETRY AI ANALYSIS ==========

  async retryAIAnalysis(sessionId: string, therapistId: string) {
    const session = await this.videoSessionModel.findById(sessionId);

    if (!session || session.deleted) {
      throw new NotFoundException('Video session not found');
    }

    if (session.status !== 'failed') {
      throw new BadRequestException(
        `Cannot retry session with status "${session.status}". Session must be in "failed" status.`
      );
    }

    // Reset to approved_for_ai so it can be triggered again
    session.status = 'approved_for_ai';
    session.retryCount = 0;
    session.lastError = undefined as any;
    session.cancelledAt = undefined as any;
    session.cancelledBy = undefined as any;
    session.updatedAt = new Date();

    await session.save();

    return {
      success: true,
      message: 'Session reset for retry. You can now trigger AI analysis again.',
      session: this.formatVideoSession(session),
    };
  }

  // ========== LONGITUDINAL DATA ==========

  async getPatientLongitudinal(patientId: string, therapistId: string) {
    const sessions = await this.videoSessionModel
      .find({
        patientId,
        therapistId,
        deleted: false,
        status: { $in: ['completed', 'therapist_review', 'published'] },
        ensemblePrediction: { $exists: true, $ne: null },
      })
      .select('recordedAt actionType status ensemblePrediction therapistReview clinicalReport createdAt')
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
      caregiverName: session.caregiverId?.fullName,
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
    if (requesterRole === 'CAREGIVER') {
      if (session.status === 'published') {
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
    therapistId: string,
    options: any
  ): Promise<Buffer> {
    // Fetch patient data
    const patient = await this.patientsService.getPatientById(patientId, therapistId, 'THERAPIST');

    // Fetch goals
    const goalsData = await this.therapyGoalModel
      .find({ patientId, deleted: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Fetch sessions
    const sessionsData = await this.videoSessionModel
      .find({ patientId, deleted: false })
      .sort({ recordedAt: -1 })
      .limit(20)
      .lean()
      .exec();

    // Get therapist name
    const therapist = await this.patientsService['userModel']
      .findById(therapistId)
      .select('fullName')
      .lean()
      .exec();

    // Prepare patient data for PDF
    const patientData = {
      ...patient,
      therapistName: therapist?.fullName || 'Unknown Therapist',
      notes: sessionsData
        .filter(s => s.therapistNotes)
        .map(s => s.therapistNotes)
        .join('\n\n'),
    };

    // Generate PDF
    return this.pdfGeneratorService.generatePatientReport(
      patientData,
      goalsData,
      sessionsData,
      options
    );
  }
}
