import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Prediction } from './schemas/prediction.schema';
import { VideoSession } from '../clinical/schemas/video-session.schema';
import { UsersService } from '../users/users.service';
import { PatientsService } from '../patients/patients.service';

@Injectable()
export class PredictService {
    private readonly uploadDir: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly patientsService: PatientsService,
        @InjectModel(Prediction.name) private predictionModel: Model<Prediction>,
        @InjectModel(VideoSession.name) private videoSessionModel: Model<VideoSession>,
    ) {
        this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
        this.ensureVideoDirExists();
    }

    private ensureVideoDirExists() {
        const videoDir = path.join(this.uploadDir, 'Videos');
        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }
    }

    private calculateAge(dateOfBirth: Date): number {
        if (!dateOfBirth) return 0;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        if (Number.isNaN(birthDate.getTime())) {
            console.warn('calculateAge: invalid date of birth', dateOfBirth);
            return 0;
        }
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 0 || age > 120) {
            console.warn(`calculateAge: out-of-range age ${age} from DOB ${birthDate.toISOString()}; clamping to 0`);
            return 0;
        }
        return age;
    }

    async predictVideo(file: Express.Multer.File, userId: string, targetId?: string) {
        const predictionUrl = this.configService.get<string>('PREDICTION_SERVICE_URL');
        const apiKey = this.configService.get<string>('X-API-KEY');

        if (!predictionUrl) {
            throw new HttpException(
                'Prediction service URL is not configured',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        let age = 0;
        let gender = 'M';

        if (targetId) {
            try {
                // Priority: Fetch patient data if targetId is provided
                const patient = await this.patientsService.findByIdInternal(targetId);
                if (patient) {
                    if (patient.dob) {
                        age = this.calculateAge(patient.dob);
                    }
                    if (patient.gender) {
                        const g = patient.gender.toLowerCase();
                        gender = g.startsWith('f') ? 'F' : 'M';
                    }
                } else {
                    // Fallback to user if patient not found (existing behavior)
                    const targetUser = await this.usersService.findById(targetId);
                    if (targetUser) {
                        if (targetUser.dateOfBirth) {
                            age = this.calculateAge(targetUser.dateOfBirth);
                        }
                        if (targetUser.gender) {
                            gender = targetUser.gender === 'F' ? 'F' : 'M';
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching patient/user data:', error);
                // Continue with default age/gender if lookup fails
            }
        } else {
            // Use current user data if no targetId
            const targetUser = await this.usersService.findById(userId);
            if (targetUser) {
                if (targetUser.dateOfBirth) {
                    age = this.calculateAge(targetUser.dateOfBirth);
                }
                if (targetUser.gender) {
                    gender = targetUser.gender === 'F' ? 'F' : 'M';
                }
            }
        }

        // 1. Save video file to local folder
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uuidv4()}${fileExtension}`;
        const relativeVideoPath = path.join('Videos', fileName);
        const fullVideoPath = path.join(this.uploadDir, relativeVideoPath);

        try {
            await fs.promises.writeFile(fullVideoPath, file.buffer);
        } catch (error) {
            console.error('Error saving video file:', error);
            throw new HttpException('Failed to save video file', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // 2. Create initial prediction record in database
        const predictionRecord = new this.predictionModel({
            userId,
            patientId: targetId,
            videoPath: relativeVideoPath,
            status: 'pending',
            filename: file.originalname,
            mimetype: file.mimetype,
        });
        await predictionRecord.save();
        console.log("2")
        // 3. Send video to prediction service
        const formData = new FormData();
        formData.append('input_file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        formData.append('age', age.toString());
        formData.append('gender', gender);

        try {
            console.log('Sending video to prediction service at:', predictionUrl);
            console.log('API Key:', apiKey ? 'Present' : 'Missing');
            const response = await firstValueFrom(
                this.httpService.post(predictionUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'X-API-KEY': apiKey || '',
                    },
                }),
            );

            // 4. Update database with prediction result
            predictionRecord.predictionResult = response.data;
            predictionRecord.status = 'completed';
            await predictionRecord.save();

            return predictionRecord;
        } catch (error) {
            console.error('Prediction service error:', error.response?.data || error.message);

            // Update record as failed
            predictionRecord.status = 'failed';
            predictionRecord.predictionResult = error.response?.data || { error: error.message };
            await predictionRecord.save();

            throw new HttpException(
                error.response?.data || 'Error connecting to prediction service',
                error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async analyzeVideoSession(sessionId: string, userId: string) {
        // 1. Find the video session
        const session = await this.videoSessionModel.findById(sessionId).exec();
        if (!session) {
            throw new HttpException('Video session not found', HttpStatus.NOT_FOUND);
        }

        // 2. Read video file from disk
        const videoUrl = session.videoUrl; // e.g. "/uploads/videos/video-123.mp4"
        // Strip leading slash and resolve relative to cwd
        const relativePath = videoUrl.startsWith('/') ? videoUrl.substring(1) : videoUrl;
        const fullVideoPath = path.resolve(relativePath);

        if (!fs.existsSync(fullVideoPath)) {
            throw new HttpException(
                `Video file not found on disk: ${fullVideoPath}`,
                HttpStatus.NOT_FOUND,
            );
        }

        const fileBuffer = await fs.promises.readFile(fullVideoPath);
        const fileName = path.basename(fullVideoPath);
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : 'video/mp4';

        // 3. Build a Multer-like file object and reuse predictVideo
        const file: Express.Multer.File = {
            fieldname: 'video',
            originalname: fileName,
            encoding: '7bit',
            mimetype: mimeType,
            buffer: fileBuffer,
            size: fileBuffer.length,
            stream: null as any,
            destination: '',
            filename: fileName,
            path: fullVideoPath,
        };

        const patientId = session.patientId?.toString();

        // 4. Update session status to processing
        session.status = 'processing';
        session.lastError = undefined as any;
        await session.save();

        const maxRetries = session.maxRetries || 3;
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 AI analysis attempt ${attempt}/${maxRetries} for session ${sessionId}`);
                const result = await this.predictVideo(file, userId, patientId);
                const predData = result.predictionResult || {};

                // 5. Store the FULL raw JSON for audit purposes
                session.rawPredictionResponse = predData;

                // 6. Extract ensemble_prediction as the primary clinical decision layer
                if (predData.ensemble_prediction) {
                    session.ensemblePrediction = {
                        severity: predData.ensemble_prediction.severity,
                        severity_confidence: predData.ensemble_prediction.severity_confidence,
                        social_affect: predData.ensemble_prediction.social_affect,
                        rrb: predData.ensemble_prediction.rrb,
                        comparison_score: predData.ensemble_prediction.comparison_score,
                        comparison_confidence: predData.ensemble_prediction.comparison_confidence,
                        method: predData.ensemble_prediction.method || 'average',
                    };
                    session.aiConfidence = Math.round(
                        (predData.ensemble_prediction.severity_confidence || 0) * 100
                    );
                } else {
                    session.aiConfidence = result.predictionResult?.confidence || 90;
                }

                // 7. Legacy aiAnalysis field for backward compatibility
                session.aiAnalysis = {
                    behaviors: predData.behaviors || [],
                    summary: predData.predictions_2d?.explainability?.summary ||
                             predData.predictions_3d?.explainability?.summary ||
                             'Analysis completed.',
                    recommendations: predData.recommendations || [],
                };

                // 8. Set status to 'completed' (awaiting therapist review)
                session.status = 'completed';
                session.retryCount = attempt - 1; // record how many retries were needed
                session.lastError = undefined as any;
                await session.save();

                console.log(`✅ AI analysis succeeded on attempt ${attempt} for session ${sessionId}`);

                return {
                    success: true,
                    message: `AI analysis completed${attempt > 1 ? ` after ${attempt} attempts` : ''}. Awaiting therapist review.`,
                    sessionId: session._id,
                    status: 'completed',
                    attempts: attempt,
                    prediction: result,
                };
            } catch (error: any) {
                lastError = error;
                // Extract detailed error message from response if available (FastAPI uses .detail)
                const errorMsg = 
                    error.response?.data?.detail || 
                    (typeof error.response?.data === 'string' ? error.response.data : null) ||
                    error.response?.data?.message ||
                    error.message || 
                    'Unknown analysis error';
                
                console.error(`❌ AI analysis attempt ${attempt}/${maxRetries} failed for session ${sessionId}: ${errorMsg}`);

                session.retryCount = attempt;
                session.lastError = errorMsg;
                await session.save();

                // If not the last attempt, wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All attempts exhausted
        session.status = 'failed';
        session.lastError = 
            lastError?.response?.data?.detail || 
            (typeof lastError?.response?.data === 'string' ? lastError.response.data : null) ||
            lastError?.message || 
            'All retry attempts exhausted';
        await session.save();

        console.error(`💀 AI analysis failed after ${maxRetries} attempts for session ${sessionId}`);
        throw lastError;
    }

    async findAll() {
        return this.predictionModel.find().sort({ createdAt: -1 }).exec();
    }

    async findByUser(userId: string) {
        return this.predictionModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }

    async findByPatient(patientId: string) {
        return this.predictionModel.find({ patientId }).sort({ createdAt: -1 }).exec();
    }

    async findOne(id: string) {
        const prediction = await this.predictionModel.findById(id).exec();
        if (!prediction) {
            throw new HttpException('Prediction not found', HttpStatus.NOT_FOUND);
        }
        return prediction;
    }
}
