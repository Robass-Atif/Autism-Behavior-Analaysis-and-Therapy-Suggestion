import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { VideoSession } from '../schemas/video-session.schema';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';

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

            // Construct full video path for the AI model
            // In a local environment, the AI model might access the filesystem directly
            const videoPath = join(process.cwd(), session.videoUrl);

            // We trigger the analysis request to FastAPI
            // We don't await the full result here if it's a long process, 
            // but we do await the trigger confirmation.
            this.performAnalysisRequest(session, videoPath);

        } catch (error) {
            this.logger.error(`Failed to trigger analysis for session ${sessionId}:`, error);
            session.status = 'failed';
            await session.save();
        }
    }

    /**
     * Internal method to handle the actual HTTP request to FastAPI
     */
    private async performAnalysisRequest(session: any, videoPath: string) {
        const sessionId = session._id.toString();
        try {
            this.logger.log(`Sending request to FastAPI at ${this.aiUrl}`);

            // Data payload for the FastAPI model
            const payload = {
                sessionId: sessionId,
                videoPath: videoPath,
                actionType: session.actionType,
                patientName: session.patientId?.fullName || 'Unknown',
                metadata: {
                    recordedAt: session.recordedAt,
                    duration: session.duration
                }
            };

            // Call the external FastAPI service
            // Using firstValueFrom to convert Observable to Promise
            const response = await firstValueFrom(
                this.httpService.post(this.aiUrl, payload)
            );

            this.logger.log(`FastAPI response received for session ${sessionId}`);

            // Process the results from FastAPI
            // Expected structure: { results: { behaviors: [], summary: "", recommendations: [], confidence: number } }
            const results = response.data?.results || response.data;

            if (results) {
                session.status = 'analyzed';
                session.aiAnalysis = {
                    behaviors: results.behaviors || [],
                    summary: results.summary || 'Analysis completed successfully.',
                    recommendations: results.recommendations || []
                };
                session.aiConfidence = results.confidence || results.aiConfidence || 90;
                await session.save();

                this.logger.log(`AI results updated for session ${sessionId}`);
            } else {
                throw new Error('No valid analysis results returned from FastAPI');
            }

        } catch (error) {
            this.logger.error(`Error during FastAPI request for session ${sessionId}:`, error.message);

            // If error occurs, update status to failed
            const sessionToUpdate = await this.videoSessionModel.findById(sessionId);
            if (sessionToUpdate) {
                sessionToUpdate.status = 'failed';
                await sessionToUpdate.save();
            }
        }
    }
}
