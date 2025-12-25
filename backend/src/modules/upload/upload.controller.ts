import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Get,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Uploads')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('license')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload license certificate' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadLicense(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    const filePath = await this.uploadService.uploadLicenseCertificate(
      file,
      userId,
    );

    return {
      success: true,
      message: 'License certificate uploaded successfully',
      data: {
        path: filePath,
      },
    };
  }

  @Post('signature')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload digital signature' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Signature uploaded successfully' })
  async uploadSignature(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    const filePath = await this.uploadService.uploadDigitalSignature(
      file,
      userId,
    );

    return {
      success: true,
      message: 'Digital signature uploaded successfully',
      data: {
        path: filePath,
      },
    };
  }

  @Get(':type/:filename')
  @ApiOperation({ summary: 'Get uploaded file' })
  @ApiResponse({ status: 200, description: 'File retrieved' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.uploadService.getFilePath(`${type}/${filename}`);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(filePath);
  }
}
