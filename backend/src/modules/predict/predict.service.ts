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

        // 3. Send video to prediction service
        const formData = new FormData();
        formData.append('video', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        formData.append('age', age.toString());
        formData.append('gender', gender);

        try {
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
