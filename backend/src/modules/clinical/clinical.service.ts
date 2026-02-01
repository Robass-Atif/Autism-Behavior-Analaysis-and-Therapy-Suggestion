import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TherapyGoal } from './schemas/therapy-goal.schema';
import { VideoSession } from './schemas/video-session.schema';
import { CreateTherapyGoalDto } from './dto/create-therapy-goal.dto';
import { UpdateTherapyGoalDto } from './dto/update-therapy-goal.dto';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';
import { PatientsService } from '../patients/patients.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { AiAnalysisService } from './services/ai-analysis.service';

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
      therapistId,
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

  async getTherapyGoals(therapistId: string, patientId?: string) {
    const query: any = {
      therapistId,
      deleted: false,
    };

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
      status: 'uploaded',
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

    // REMOVED: Automatic AI analysis trigger
    // Now strictly manual as per FR-5 requirements

    return {
      success: true,
      message: 'Video session uploaded successfully. Ready for therapist review.',
      session: this.formatVideoSession(session),
    };
  }

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
      sessions: sessions.map((s) => this.formatVideoSession(s)),
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

    return this.formatVideoSession(session);
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

  private formatVideoSession(session: any) {
    return {
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
      aiConfidence: session.aiConfidence,
      aiAnalysis: session.aiAnalysis,
      therapistNotes: session.therapistNotes,
      reviewed: session.reviewed,
      reviewedAt: session.reviewedAt,
      createdAt: session.createdAt,
    };
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
