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
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
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
        await session.save();

        try {
            const result = await this.predictVideo(file, userId, patientId);

            // 5. Update video session with AI results
            session.status = 'analyzed';
            session.aiConfidence = result.predictionResult?.confidence || 90;
            session.aiAnalysis = {
                behaviors: result.predictionResult?.behaviors || [],
                summary: result.predictionResult?.summary || 'Analysis completed.',
                recommendations: result.predictionResult?.recommendations || [],
            };
            await session.save();

            return {
                success: true,
                message: 'AI analysis completed successfully.',
                sessionId: session._id,
                status: 'analyzed',
                prediction: result,
            };
        } catch (error) {
            session.status = 'failed';
            await session.save();
            throw error;
        }
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
