import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { VideoSession } from '../schemas/video-session.schema';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class AiAnalysisService {
    private readonly logger = new Logger(AiAnalysisService.name);
    private readonly aiUrl: string;

    constructor(
        private configService: ConfigService,
        private httpService: HttpService,
        @InjectModel(VideoSession.name) private videoSessionModel: Model<VideoSession>,
    ) {
        this.aiUrl = this.configService.get<string>('AI_ANALYSIS_URL') || 'http://localhost:8000/analyze';
    }

    /**
     * Triggers analysis by calling the external FastAPI service
     * @param sessionId The ID of the video session to analyze
     */
    async analyzeVideo(sessionId: string): Promise<void> {
        const session = await this.videoSessionModel.findById(sessionId).populate('patientId');
        if (!session) {
            this.logger.error(`Session not found: ${sessionId}`);
            return;
        }

        try {
            this.logger.log(`Initiating AI analysis for session ${sessionId} via FastAPI`);

            const videoPath = join(process.cwd(), session.videoUrl);

            // Execute retry logic loop
            await this.performAnalysisRequest(session, videoPath);

        } catch (error: any) {
            this.logger.error(`Failed to trigger analysis for session ${sessionId}:`, error);
            session.status = 'failed';
            session.lastError = error?.message || 'Failed to trigger AI analysis';
            await session.save();
        }
    }

    /**
     * Internal method to handle the actual HTTP request to FastAPI
     */
    private async performAnalysisRequest(session: any, videoPath: string) {
        const sessionId = session._id.toString();
        const maxRetries = session.maxRetries || 3;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.log(`🚀 FastAPI Request attempt ${attempt}/${maxRetries} for ${sessionId} at ${this.aiUrl}`);

                const payload = new FormData();
                
                // Read the actual video file into a buffer to send as multipart form-data
                const videoBuffer = fs.readFileSync(videoPath);
                
                // Force .mp4 extension — FastAPI only accepts .mp4/.avi/.mov
                let originalName = session.videoUrl.split('/').pop() || 'video.mp4';
                if (!originalName.match(/\.(mp4|avi|mov)$/i)) {
                    originalName = originalName.replace(/\.[^.]+$/, '.mp4');
                }
                
                payload.append('input_file', videoBuffer, {
                    filename: originalName,
                    contentType: 'video/mp4'
                });
                
                payload.append('age', session.patientId?.age?.toString() || '5');
                
                let genderStr = session.patientId?.gender || 'M';
                // FastAPI requires strictly 'M' or 'F'
                if (typeof genderStr === 'string' && genderStr.length > 0) {
                    genderStr = genderStr.charAt(0).toUpperCase();
                }
                if (genderStr !== 'M' && genderStr !== 'F') {
                    genderStr = 'M'; // Default to M
                }
                
                payload.append('gender', genderStr);

                const apiKey = this.configService.get<string>('X-API-Key') || 'your-api-key-change-this-please'
                const response = await firstValueFrom(
                    this.httpService.post(`${this.aiUrl.replace('/analyze', '')}/predict`, payload, {
                        headers: {
                            'X-API-Key': apiKey,
                            ...payload.getHeaders()
                        }
                    })
                );

                this.logger.log(`✅ FastAPI response received for session ${sessionId} on attempt ${attempt}`);

                const data = response.data;

                if (data) {
                    const pred = data.predictions_2d || data.ensemble_prediction || data.predictions_3d || {};
                    const hasError = pred?.error;
                    const severity = pred?.severity ?? null;
                    const severityConfidence = pred?.severity_confidence ?? 0;
                    const socialAffect = pred?.social_affect ?? 0;
                    const rrb = pred?.rrb ?? 0;
                    const comparisonScore = pred?.comparison_score ?? 0;

                    // Map severity level to label
                    const severityLabels = ['None/Minimal', 'Low', 'Moderate', 'High', 'Severe'];
                    const severityLabel = severity !== null ? (severityLabels[severity] || `Level ${severity}`) : 'Unknown';

                    // Generate meaningful behaviors from the model output
                    const behaviors: any[] = [];
                    if (!hasError) {
                        behaviors.push({
                            type: 'Social Affect',
                            confidence: Math.min(severityConfidence, 1),
                            timestamp: 0,
                            severity: socialAffect > 6 ? 'Severe' : socialAffect > 3 ? 'Mild' : 'Normal',
                            score: socialAffect
                        });
                        behaviors.push({
                            type: 'Restricted & Repetitive Behaviors',
                            confidence: Math.min(severityConfidence, 1),
                            timestamp: 0,
                            severity: rrb > 4 ? 'Severe' : rrb > 2 ? 'Mild' : 'Normal',
                            score: rrb
                        });
                    }

                    // Generate summary
                    const summary = hasError
                        ? `Analysis completed with limited data quality. ${pred.error}`
                        : `ADOS-2 assessment indicates ${severityLabel} severity (Level ${severity}). ` +
                          `Social Affect score: ${socialAffect.toFixed(1)}, RRB score: ${rrb.toFixed(1)}. ` +
                          `Comparison score: ${comparisonScore}. Model confidence: ${(severityConfidence * 100).toFixed(0)}%.`;

                    // Generate recommendations based on severity
                    const recommendations: string[] = [];
                    if (severity !== null) {
                        if (severity >= 3) {
                            recommendations.push('Immediate clinical assessment recommended');
                            recommendations.push('Consider intensive behavioral intervention (ABA therapy)');
                            recommendations.push('Schedule follow-up within 2 weeks');
                        } else if (severity >= 2) {
                            recommendations.push('Continue monitoring with regular assessments');
                            recommendations.push('Consider targeted social skills intervention');
                            recommendations.push('Schedule follow-up within 4 weeks');
                        } else {
                            recommendations.push('Maintain current therapy plan');
                            recommendations.push('Continue periodic developmental monitoring');
                        }
                    }

                    session.status = 'completed';
                    session.aiAnalysis = {
                        behaviors,
                        summary,
                        recommendations,
                        rawPrediction: {
                            severity,
                            severityLabel,
                            severityConfidence,
                            socialAffect,
                            rrb,
                            comparisonScore,
                            processingInfo: data.processing_info
                        }
                    };
                    session.aiConfidence = hasError ? 50 : Math.round(severityConfidence * 100);

                    // Save the full raw FastAPI response for SessionReportScreen
                    session.rawPredictionResponse = {
                        predictions_2d: data.predictions_2d || null,
                        predictions_3d: data.predictions_3d || null,
                    };

                    // Build ensemble prediction (use primary model data)
                    const ensemble = data.ensemble_prediction || pred;
                    session.ensemblePrediction = {
                        severity: ensemble.severity ?? severity,
                        severity_confidence: ensemble.severity_confidence ?? severityConfidence,
                        social_affect: ensemble.social_affect ?? socialAffect,
                        rrb: ensemble.rrb ?? rrb,
                        comparison_score: ensemble.comparison_score ?? comparisonScore,
                        comparison_confidence: ensemble.comparison_confidence ?? 0,
                        method: data.ensemble_prediction ? 'average' : (data.predictions_2d ? '2D' : '3D'),
                    };

                    // Generate clinical report data for DSM-5 classification
                    session.clinicalReport = {
                        dsm5_classification: {
                            level: severity >= 3 ? 'Level 3 - Requiring very substantial support' :
                                   severity >= 2 ? 'Level 2 - Requiring substantial support' :
                                   severity >= 1 ? 'Level 1 - Requiring support' :
                                   'Below clinical threshold',
                            social_communication: socialAffect > 10 ? 'Marked deficits' :
                                                  socialAffect > 5 ? 'Notable deficits' : 'Mild deficits',
                            restricted_behaviors: rrb > 4 ? 'Significant RRBs observed' :
                                                  rrb > 2 ? 'Moderate RRBs observed' : 'Minimal RRBs observed',
                        },
                        recommended_interventions: recommendations.map((rec, i) => ({
                            name: rec,
                            priority: i === 0 ? 'high' : 'medium',
                            description: rec,
                        })),
                    };

                    session.retryCount = attempt - 1;
                    session.lastError = undefined;
                    await session.save();
                    
                    this.logger.log(`AI results updated for session ${sessionId} — Severity: ${severityLabel}, Confidence: ${session.aiConfidence}%`);
                    return; // exit the retry loop on success
                } else {
                    throw new Error('No valid analysis results returned from FastAPI');
                }

            } catch (error: any) {
                lastError = error;
                const errorDataStr = error.response?.data ? JSON.stringify(error.response.data) : '';
                const errorMsg = errorDataStr || error?.message || error?.toString() || 'Unknown error';
                this.logger.error(`❌ FastAPI Request attempt ${attempt}/${maxRetries} failed for session ${sessionId}: ${errorMsg}`);

                session.retryCount = attempt;
                session.lastError = errorMsg;
                await session.save();

                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    this.logger.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Exhausted all retries
        this.logger.error(`💀 FastAPI failed after ${maxRetries} attempts for session ${sessionId}`);
        const sessionToUpdate = await this.videoSessionModel.findById(sessionId);
        if (sessionToUpdate) {
            sessionToUpdate.status = 'failed';
            sessionToUpdate.lastError = lastError?.message || 'All retry attempts exhausted';
            await sessionToUpdate.save();
        }
    }
}
