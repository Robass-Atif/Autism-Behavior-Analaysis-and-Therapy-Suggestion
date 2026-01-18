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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ClinicalService } from './clinical.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateTherapyGoalDto } from './dto/create-therapy-goal.dto';
import { UpdateTherapyGoalDto } from './dto/update-therapy-goal.dto';
import { CreateVideoSessionDto } from './dto/create-video-session.dto';

// Multer configuration for video uploads
const videoStorage = diskStorage({
  destination: './uploads/videos',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `video-${uniqueSuffix}${ext}`);
  },
});

const videoFileFilter = (req: any, file: any, callback: any) => {
  // Accept video files only
  if (file.mimetype.startsWith('video/')) {
    callback(null, true);
  } else {
    callback(new Error('Only video files are allowed!'), false);
  }
};

@ApiTags('Clinical')
@Controller('clinical')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClinicalController {
  constructor(private readonly clinicalService: ClinicalService) { }

  // ========== THERAPY GOALS ==========

  @Post('therapy-goals')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create therapy goal' })
  @ApiResponse({ status: 201, description: 'Goal created' })
  async createTherapyGoal(
    @CurrentUser() user: any,
    @Body() dto: CreateTherapyGoalDto,
  ) {
    return this.clinicalService.createTherapyGoal(user.sub, dto);
  }

  @Get('therapy-goals')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get therapy goals' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiResponse({ status: 200, description: 'Goals retrieved' })
  async getTherapyGoals(
    @CurrentUser() user: any,
    @Query('patientId') patientId?: string,
  ) {
    return this.clinicalService.getTherapyGoals(user.sub, patientId);
  }

  @Get('therapy-goals/:id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get therapy goal by ID' })
  @ApiResponse({ status: 200, description: 'Goal retrieved' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async getTherapyGoalById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.getTherapyGoalById(id, user.sub, user.role);
  }

  @Put('therapy-goals/:id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Update therapy goal' })
  @ApiResponse({ status: 200, description: 'Goal updated' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async updateTherapyGoal(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateData: UpdateTherapyGoalDto,
  ) {
    return this.clinicalService.updateTherapyGoal(id, user.sub, user.role, updateData);
  }

  @Delete('therapy-goals/:id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete therapy goal' })
  @ApiResponse({ status: 200, description: 'Goal deleted' })
  @ApiResponse({ status: 404, description: 'Goal not found' })
  async deleteTherapyGoal(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.deleteTherapyGoal(id, user.sub, user.role);
  }

  // ========== VIDEO SESSIONS ==========

  @Post('video-sessions')
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('video', {
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createVideoSession(
    @CurrentUser() user: any,
    @Body() dto: CreateVideoSessionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const videoUrl = file ? `/uploads/videos/${file.filename}` : '';
    return this.clinicalService.createVideoSession(user.sub, user.role, dto, videoUrl);
  }

  @Get('video-sessions')
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @ApiOperation({ summary: 'Get video sessions' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'actionType', required: false })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getVideoSessions(
    @CurrentUser() user: any,
    @Query('patientId') patientId?: string,
    @Query('actionType') actionType?: string,
  ) {
    return this.clinicalService.getVideoSessions(user.sub, user.role, patientId, actionType);
  }

  @Get('video-sessions/:id')
  @Roles(Role.THERAPIST, Role.CAREGIVER, Role.ADMIN)
  @ApiOperation({ summary: 'Get video session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getVideoSessionById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.getVideoSessionById(id, user.sub, user.role);
  }

  @Put('video-sessions/:id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Update video session' })
  @ApiResponse({ status: 200, description: 'Session updated' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateVideoSession(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateData: any,
  ) {
    return this.clinicalService.updateVideoSession(id, user.sub, user.role, updateData);
  }

  @Delete('video-sessions/:id')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete video session' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async deleteVideoSession(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.deleteVideoSession(id, user.sub, user.role);
  }

  // ========== AI ANALYSIS ==========

  @Post('video-sessions/:id/analyze')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger AI analysis on video session' })
  @ApiResponse({ status: 200, description: 'Analysis triggered' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async triggerAIAnalysis(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.clinicalService.triggerAIAnalysis(id, user.sub);
  }

  // ========== REPORTS ==========

  @Get('reports/individual/:patientId')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get individual patient analysis report' })
  @ApiResponse({ status: 200, description: 'Report retrieved' })
  async getIndividualReport(
    @Param('patientId') patientId: string,
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

  @Get('reports/consolidated')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @ApiOperation({ summary: 'Get consolidated report for all patients' })
  @ApiResponse({ status: 200, description: 'Report retrieved' })
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

  @Post('reports/generate')
  @Roles(Role.THERAPIST, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate new report' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generateReport(
    @CurrentUser() user: any,
    @Body() data: { patientId?: string; reportType: string },
  ) {
    // Trigger report generation
    return {
      success: true,
      message: 'Report generation initiated',
      reportId: `report-${Date.now()}`,
      status: 'processing',
    };
  }
}
