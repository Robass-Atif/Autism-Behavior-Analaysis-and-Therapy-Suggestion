import {
    Controller,
    Get,
    Post,
    Param,
    Req,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PredictService } from './predict.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Predict')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('predict')
export class PredictController {
    constructor(private readonly predictService: PredictService) { }

    @Post('analyze/:id')
    @ApiOperation({ summary: 'Trigger AI analysis for an existing video session by session ID' })
    async analyzeSession(
        @Param('id') sessionId: string,
        @Req() req: any,
    ) {
        return this.predictService.analyzeVideoSession(sessionId, req.user.sub);
    }

    @Post(':id')
    @ApiOperation({ summary: 'Process video for a specific patient ID' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                video: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('video'))
    async predictWithId(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    // 50MB max size
                    new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
                    // Allow common video mimetypes
                    new FileTypeValidator({ fileType: 'video/*' }),
                ],
            }),
        ) file: Express.Multer.File,
        @Req() req: any,
        @Param('id') patientId: string,
    ) {
        return this.predictService.predictVideo(file, req.user.sub, patientId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get all predictions for a specific patient ID' })
    async getPatientPredictions(@Param('id') patientId: string) {
        return this.predictService.findByPatient(patientId);
    }
}
