import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private uploadDir: string;
  private maxFileSize: number;
  private allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ];

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 5242880); // 5MB

    // Ensure upload directory exists
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists(): void {
    const dirs = ['licenses', 'signatures', 'documents'];
    dirs.forEach((dir) => {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  async uploadLicenseCertificate(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const fileName = `license_${userId}_${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, 'licenses', fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return `licenses/${fileName}`;
  }

  async uploadDigitalSignature(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const fileName = `signature_${userId}_${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, 'signatures', fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return `signatures/${fileName}`;
  }

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    documentType: string,
  ): Promise<string> {
    this.validateFile(file);

    const fileExtension = path.extname(file.originalname);
    const fileName = `${documentType}_${userId}_${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, 'documents', fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return `documents/${fileName}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);

    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getFilePath(relativePath: string): string {
    return path.join(this.uploadDir, relativePath);
  }
}
