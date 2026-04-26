import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "path";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from "@nestjs/swagger";
import { ClinicalService } from "./clinical.service";
import { CryptoService } from "../../common/services/crypto.service";
import { BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Role } from "../../common/enums/role.enum";
import { CreateTherapyGoalDto } from "./dto/create-therapy-goal.dto";
import { UpdateTherapyGoalDto } from "./dto/update-therapy-goal.dto";
import { CreateVideoSessionDto } from "./dto/create-video-session.dto";

// Multer configuration for video uploads
const videoStorage = memoryStorage();

const videoFileFilter = (req: any, file: any, callback: any) => {
  // Accept video files only
  if (file.mimetype.startsWith("video/")) {
    callback(null, true);
  } else {
    callback(new Error("Only video files are allowed!"), false);
  }
};

@ApiTags("Clinical")
@Controller("clinical")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClinicalController {
  constructor(
    private readonly clinicalService: ClinicalService,
    private readonly cryptoService: CryptoService
  ) {}

  // ========== THERAPY GOALS ==========

  @Post("therapy-goals")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create therapy goal" })
  @ApiResponse({ status: 201, description: "Goal created" })
  async createTherapyGoal(
    @CurrentUser() user: any,
    @Body() dto: CreateTherapyGoalDto,
  ) {
    return this.clinicalService.createTherapyGoal(user.sub, dto);
  }

  @Get("therapy-goals")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Get therapy goals" })
  @ApiQuery({ name: "patientId", required: false })
  @ApiResponse({ status: 200, description: "Goals retrieved" })
  async getTherapyGoals(
    @CurrentUser() user: any,
    @Query("patientId") patientId?: string,
  ) {
    return this.clinicalService.getTherapyGoals(user.sub, user.role, patientId);
  }

  @Get("therapy-goals/me")
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: "Get my therapy goals" })
  @ApiResponse({ status: 200, description: "Goals retrieved" })
  async getMyTherapyGoals(@CurrentUser() user: any) {
    return this.clinicalService.getTherapyGoals(user.sub, Role.PATIENT);
  }

  @Get("therapy-goals/:id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Get therapy goal by ID" })
  @ApiResponse({ status: 200, description: "Goal retrieved" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async getTherapyGoalById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.getTherapyGoalById(id, user.sub, user.role);
  }

  @Put("therapy-goals/:id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Update therapy goal" })
  @ApiResponse({ status: 200, description: "Goal updated" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async updateTherapyGoal(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() updateData: UpdateTherapyGoalDto,
  ) {
    return this.clinicalService.updateTherapyGoal(
      id,
      user.sub,
      user.role,
      updateData,
    );
  }

  @Delete("therapy-goals/:id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete therapy goal" })
  @ApiResponse({ status: 200, description: "Goal deleted" })
  @ApiResponse({ status: 404, description: "Goal not found" })
  async deleteTherapyGoal(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.deleteTherapyGoal(id, user.sub, user.role);
  }

  // ========== VIDEO SESSIONS ==========

  @Post("video-sessions")
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor("video", {
      storage: videoStorage,
      fileFilter: videoFileFilter,
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload video session" })
  @ApiResponse({ status: 201, description: "Session created" })
  async createVideoSession(
    @CurrentUser() user: any,
    @Body() dto: CreateVideoSessionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Video file is required");
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname) || ".webm";
    const filename = `video-${uniqueSuffix}${ext}`;
    const uploadDir = "./uploads/videos";
    const fs = require('fs');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = `${uploadDir}/${filename}`;

    const { key, iv } = this.cryptoService.generateFileCredentials();

    const cryptoMod = require('crypto');
    const cipher = cryptoMod.createCipheriv("aes-256-gcm", key, iv);
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(file.buffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    fs.writeFileSync(filepath, encryptedBuffer);

    const encryptedKeyPattern = this.cryptoService.encryptFileKey(key);

    const videoUrl = `/uploads/videos/${filename}`;
    
    return this.clinicalService.createVideoSession(
      user.sub,
      user.role,
      dto,
      videoUrl,
      encryptedKeyPattern,
      iv.toString("base64"),
      authTag.toString("base64")
    );
  }

  @Get("/uploads/videos/:filename")
  @ApiOperation({ summary: "Stream a decrypted video file" })
  @ApiResponse({ status: 200, description: "Streamed video" })
  async streamVideo(@Param("filename") filename: string, @Res() res: any) {
    const videoUrl = `/uploads/videos/${filename}`;
    
    // We need to fetch the session to get the encryption keys
    // Since we don't have the user object here easily if it's a raw video tag request without Auth headers,
    // we bypass AuthGuard for this specific streaming route or require signed URLs. 
    // Given the current architecture, passing JWT in video tag is hard, so we handle it generically here
    // but in production, we should use a signed short-lived token in the query string.
    
    await this.clinicalService.streamDecryptedVideo(videoUrl, res);
  }

  @Get("video-sessions")
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @ApiOperation({ summary: "Get video sessions" })
  @ApiQuery({ name: "patientId", required: false })
  @ApiQuery({ name: "actionType", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiResponse({ status: 200, description: "Sessions retrieved" })
  async getVideoSessions(
    @CurrentUser() user: any,
    @Query("patientId") patientId?: string,
    @Query("actionType") actionType?: string,
  ) {
    return this.clinicalService.getVideoSessions(
      user.sub,
      user.role,
      patientId,
      actionType,
    );
  }

  @Get("video-sessions/me")
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: "Get my video sessions" })
  @ApiResponse({ status: 200, description: "Sessions retrieved" })
  async getMyVideoSessions(@CurrentUser() user: any) {
    return this.clinicalService.getVideoSessions(user.sub, Role.PATIENT);
  }

  @Get("video-sessions/:id")
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @ApiOperation({ summary: "Get video session by ID" })
  @ApiResponse({ status: 200, description: "Session retrieved" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async getVideoSessionById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.getVideoSessionById(id, user.sub, user.role);
  }

  @Put("video-sessions/:id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Update video session" })
  @ApiResponse({ status: 200, description: "Session updated" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async updateVideoSession(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() updateData: any,
  ) {
    return this.clinicalService.updateVideoSession(
      id,
      user.sub,
      user.role,
      updateData,
    );
  }

  @Delete("video-sessions/:id")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete video session" })
  @ApiResponse({ status: 200, description: "Session deleted" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async deleteVideoSession(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.deleteVideoSession(id, user.sub, user.role);
  }

  // ========== VIDEO SESSION WORKFLOW ==========

  @Post("video-sessions/:id/approve")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve video session for AI analysis",
    description:
      "Therapist approves a pending_review video for AI analysis. Transitions status to approved_for_ai.",
  })
  @ApiResponse({ status: 200, description: "Session approved for AI" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async approveForAI(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.approveForAI(id, user.sub);
  }

  @Post("video-sessions/:id/analyze")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Trigger AI analysis on video session",
    description:
      "Triggers AI analysis on an approved_for_ai session. Only works after therapist approval.",
  })
  @ApiResponse({ status: 200, description: "Analysis triggered" })
  @ApiResponse({ status: 400, description: "Session not approved for AI" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async triggerAIAnalysis(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.triggerAIAnalysis(id, user.sub);
  }

  @Post("video-sessions/:id/review")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Submit therapist review for video session",
    description:
      "Therapist submits review with optional severity override, notes, and therapy plan adjustments.",
  })
  @ApiResponse({ status: 200, description: "Review submitted" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async submitTherapistReview(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body()
    reviewData: {
      overrideSeverity?: number;
      reviewNotes?: string;
      therapyPlanAdjustments?: string;
    },
  ) {
    return this.clinicalService.submitTherapistReview(id, user.sub, reviewData);
  }

  @Post("video-sessions/:id/publish")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish session report",
    description:
      "Publishes the therapist-reviewed report, making it visible to caregivers.",
  })
  @ApiResponse({ status: 200, description: "Report published" })
  @ApiResponse({
    status: 400,
    description: "Session not in therapist_review status",
  })
  @ApiResponse({ status: 404, description: "Session not found" })
  async publishReport(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.publishReport(id, user.sub);
  }

  // ========== CANCEL AI ANALYSIS ==========

  @Post("video-sessions/:id/cancel")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cancel AI analysis",
    description:
      "Cancels an in-progress or approved-for-AI session, returning it to approved_for_ai status.",
  })
  @ApiResponse({ status: 200, description: "AI analysis cancelled" })
  @ApiResponse({ status: 400, description: "Invalid status for cancel" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async cancelAIAnalysis(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.cancelAIAnalysis(id, user.sub);
  }

  @Post("video-sessions/:id/approve-therapy")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Approve analysis for therapy recommendation",
    description: "Marks a completed/published analysis as approved to be included in the next therapy generation."
  })
  @ApiResponse({ status: 200, description: "Analysis approved for therapy" })
  async approveTherapyAnalysis(
    @Param("id") id: string, 
    @CurrentUser() user: any,
    @Body() data: { approved: boolean }
  ) {
    return this.clinicalService.approveTherapyAnalysis(id, user.sub, data.approved);
  }


  // ========== THERAPY RECOMMENDATION (ON-DEMAND) ==========

  @Post("video-sessions/:id/therapy-recommend")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Generate therapy recommendations via RAG pipeline",
    description:
      "Triggers the RAG-based therapy recommendation pipeline for a completed session. " +
      "Requires prediction data to be available (AI analysis must have completed). " +
      "Returns a structured clinical report with evidence-based therapy suggestions.",
  })
  @ApiResponse({ status: 200, description: "Therapy recommendations generated" })
  @ApiResponse({ status: 400, description: "No prediction data available" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async generateTherapyRecommendation(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.generateTherapyRecommendation(id, user.sub);
  }

  @Post("patients/:patientId/therapy-recommend")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Generate aggregated therapy recommendations for patient",
    description: "Collects all completed AI analysis for a patient and generates combined therapy insights."
  })
  @ApiResponse({ status: 200, description: "Aggregated therapy recommendations generated" })
  @ApiResponse({ status: 404, description: "Patient not found" })
  async generatePatientTherapyRecommendation(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.generatePatientTherapyRecommendation(patientId, user.sub);
  }

  @Post("patients/:patientId/publish-report")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Publish aggregated therapy report for patient",
    description: "Makes the latest clinical report visible to caregivers."
  })
  @ApiResponse({ status: 200, description: "Report published" })
  async publishPatientClinicalReport(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.publishPatientClinicalReport(patientId, user.sub);
  }
  @Post("patients/:patientId/resend-report")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Resend published aggregated therapy report to caregiver",
    description: "Re-triggers email notification for an already published report."
  })
  @ApiResponse({ status: 200, description: "Report resent" })
  async resendPatientClinicalReport(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.resendPatientClinicalReport(patientId, user.sub);
  }

  @Put("patients/:patientId/clinical-report")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Update patient clinical report",
    description: "Saves manual edits to the clinical report."
  })
  @ApiResponse({ status: 200, description: "Report updated" })
  async updatePatientClinicalReport(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
    @Body() clinicalReport: any,
  ) {
    return this.clinicalService.updatePatientClinicalReport(patientId, user.sub, clinicalReport);
  }

  @Delete("patients/:patientId/clinical-report")
  @Roles(Role.THERAPIST, Role.ADMIN, Role.CAREGIVER)
  @ApiOperation({
    summary: "Unpublish/Hide patient clinical report",
    description: "Hides the latest clinical report from the caregiver's view."
  })
  @ApiResponse({ status: 200, description: "Report unpublished" })
  async deletePatientClinicalReport(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.unpublishPatientClinicalReport(patientId, user.sub, user.role);
  }

  // ========== RETRY AI ANALYSIS ==========

  @Post("video-sessions/:id/retry")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retry failed AI analysis",
    description:
      "Resets a failed session back to approved_for_ai so AI analysis can be triggered again.",
  })
  @ApiResponse({ status: 200, description: "Session reset for retry" })
  @ApiResponse({ status: 400, description: "Session is not in failed status" })
  @ApiResponse({ status: 404, description: "Session not found" })
  async retryAIAnalysis(@Param("id") id: string, @CurrentUser() user: any) {
    return this.clinicalService.retryAIAnalysis(id, user.sub);
  }

  // ========== LONGITUDINAL DATA ==========

  @Get("patients/:patientId/longitudinal")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({
    summary: "Get longitudinal data for patient",
    description:
      "Returns ensemble_prediction metrics across all completed sessions for trend analysis.",
  })
  @ApiResponse({ status: 200, description: "Longitudinal data retrieved" })
  async getPatientLongitudinal(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.getPatientLongitudinal(patientId, user.sub);
  }

  // ========== REPORTS ==========

  @Get("reports/individual/:patientId")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Get individual patient analysis report" })
  @ApiResponse({ status: 200, description: "Report retrieved" })
  async getIndividualReport(
    @Param("patientId") patientId: string,
    @CurrentUser() user: any,
  ) {
    // Generate comprehensive individual patient report
    return {
      patientId,
      generatedAt: new Date(),
      therapistId: user.sub,
      summary: {
        totalSessions: 0,
        totalGoals: 0,
        achievedGoals: 0,
        progressPercentage: 0,
      },
      behaviors: [],
      recommendations: [],
      goalsProgress: [],
      recentSessions: [],
    };
  }

  @Get("reports/consolidated")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: "Get consolidated report for all patients" })
  @ApiResponse({ status: 200, description: "Report retrieved" })
  async getConsolidatedReport(@CurrentUser() user: any) {
    // Generate consolidated report across all patients
    return {
      therapistId: user.sub,
      generatedAt: new Date(),
      totalPatients: 0,
      summary: {
        totalSessions: 0,
        totalGoals: 0,
        avgProgress: 0,
      },
      patientsSummary: [],
      trends: [],
    };
  }

  @Post("reports/generate-pdf")
  @Roles(Role.THERAPIST, Role.ADMIN, Role.CAREGIVER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate PDF report" })
  @ApiResponse({ status: 200, description: "PDF generated" })
  async generatePDF(
    @CurrentUser() user: any,
    @Body()
    options: {
      patientId: string;
      sessionId?: string;
      includeGoals?: boolean;
      includeCharts?: boolean;
      includeTables?: boolean;
      includeNotes?: boolean;
      watermark?: boolean;
      password?: string;
      reportType?: string;
    },
    @Res() res: any,
  ) {
    const pdfBuffer = await this.clinicalService.generatePatientPDF(
      options.patientId,
      user.sub,
      options,
      user.role,
    );

    res.setHeader("Content-Type", "application/pdf");
    const fileRef = options.sessionId || options.patientId;
    const prefix = options.sessionId ? "session-report" : "report";
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${prefix}-${fileRef}-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Post("reports/generate")
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate new report" })
  @ApiResponse({ status: 200, description: "Report generated" })
  async generateReport(
    @CurrentUser() user: any,
    @Body() data: { patientId?: string; reportType: string },
  ) {
    // Trigger report generation
    return {
      success: true,
      message: "Report generation initiated",
      reportId: `report-${Date.now()}`,
      status: "processing",
    };
  }
}



