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

    @Post(':id')
    @ApiOperation({ summary: 'Predict from video file for a specific patient/user ID' })
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
                    // 50MB max size (adjust as needed)
                    new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
                    // Allow common video mimetypes
                    new FileTypeValidator({ fileType: 'video/*' }),
                ],
            }),
        ) file: Express.Multer.File,
        @Req() req: any,
        @Param('id') targetId: string,
    ) {
        return this.predictService.predictVideo(file, req.user.userId, targetId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all predictions (Admin/Dev only)' })
    async getAll() {
        return this.predictService.findAll();
    }

    @Get('user/me')
    @ApiOperation({ summary: 'Get all predictions for logged in user' })
    async getMyPredictions(@Req() req: any) {
        return this.predictService.findByUser(req.user.userId);
    }

    @Get('patient/:patientId')
    @ApiOperation({ summary: 'Get all predictions for a specific patient' })
    async getPatientPredictions(@Param('patientId') patientId: string) {
        return this.predictService.findByPatient(patientId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get prediction by ID' })
    async getOne(@Param('id') id: string) {
        return this.predictService.findOne(id);
    }
}
