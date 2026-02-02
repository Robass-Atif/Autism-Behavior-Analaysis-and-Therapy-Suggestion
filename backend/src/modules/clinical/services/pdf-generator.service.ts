import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLib } from 'pdf-lib';
import * as fs from 'fs';

export interface ReportOptions {
    patientId: string;
    includeGoals?: boolean;
    includeCharts?: boolean;
    includeTables?: boolean;
    includeNotes?: boolean;
    watermark?: boolean;
    password?: string;
}

@Injectable()
export class PdfGeneratorService {
    /**
     * Generate a patient clinical report as PDF
     */
    async generatePatientReport(
        patientData: any,
        goalsData: any[],
        sessionsData: any[],
        options: ReportOptions
    ): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks: Buffer[] = [];

                doc.on('data', (chunk: any) => chunks.push(chunk));
                doc.on('end', async () => {
                    let pdfBuffer = Buffer.concat(chunks);

                    // Add password protection if requested
                    if (options.password) {
                        pdfBuffer = await this.addPasswordProtection(pdfBuffer, options.password) as any;
                    }

                    resolve(pdfBuffer);
                });

                // Add watermark if requested
                if (options.watermark) {
                    this.addWatermark(doc);
                }

                // Header Section
                this.addHeader(doc, patientData);

                // Patient Information
                this.addPatientInfo(doc, patientData);

                // Therapy Goals Section
                if (options.includeGoals && goalsData.length > 0) {
                    this.addGoalsSection(doc, goalsData);
                }

                // Session Summary
                if (sessionsData.length > 0) {
                    this.addSessionsSection(doc, sessionsData, options.includeTables || false);
                }

                // Therapist Notes
                if (options.includeNotes && patientData.notes) {
                    this.addNotesSection(doc, patientData.notes);
                }

                // Footer
                this.addFooter(doc, patientData.therapistName);

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Add watermark to PDF
     */
    private addWatermark(doc: any) {
        doc.save();
        doc.fontSize(60)
            .fillColor('#cccccc', 0.15)
            .rotate(-45, { origin: [300, 400] })
            .text('CONFIDENTIAL', 100, 400, {
                align: 'center',
                width: 500
            });
        doc.restore();
    }

    /**
     * Add header section
     */
    private addHeader(doc: any, patientData: any) {
        // Title
        doc.fontSize(24)
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text('Clinical Summary Report', { align: 'center' });

        doc.moveDown(0.5);

        // Subtitle
        doc.fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text('Autism Behavior Analysis & Therapy System', { align: 'center' });

        doc.moveDown(1);

        // Horizontal line
        doc.moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .strokeColor('#000000')
            .lineWidth(2)
            .stroke();

        doc.moveDown(1);
    }

    /**
     * Add patient information section
     */
    private addPatientInfo(doc: any, patientData: any) {
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Patient Information');

        doc.moveDown(0.5);

        const infoY = doc.y;

        // Left column
        doc.fontSize(10)
            .font('Helvetica-Bold')
            .text('Patient Name:', 50, infoY)
            .font('Helvetica')
            .text(patientData.fullName, 150, infoY);

        doc.font('Helvetica-Bold')
            .text('MRN:', 50, infoY + 20)
            .font('Helvetica')
            .text(patientData.mrn, 150, infoY + 20);

        doc.font('Helvetica-Bold')
            .text('Date of Birth:', 50, infoY + 40)
            .font('Helvetica')
            .text(new Date(patientData.dob).toLocaleDateString(), 150, infoY + 40);

        // Right column
        doc.font('Helvetica-Bold')
            .text('ASD Severity:', 300, infoY)
            .font('Helvetica')
            .text(patientData.asdSeverity || 'N/A', 400, infoY);

        doc.font('Helvetica-Bold')
            .text('Report Date:', 300, infoY + 20)
            .font('Helvetica')
            .text(new Date().toLocaleDateString(), 400, infoY + 20);

        doc.font('Helvetica-Bold')
            .text('Status:', 300, infoY + 40)
            .font('Helvetica')
            .text(patientData.status, 400, infoY + 40);

        doc.moveDown(3);
    }

    /**
     * Add therapy goals section
     */
    private addGoalsSection(doc: any, goalsData: any[]) {
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Therapy Goals');

        doc.moveDown(0.5);

        goalsData.forEach((goal, index) => {
            // Check if we need a new page
            if (doc.y > 700) {
                doc.addPage();
            }

            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text(`${index + 1}. ${goal.title}`);

            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#666666')
                .text(`Category: ${goal.category} | Priority: ${goal.priority} | Status: ${goal.status}`);

            // Progress bar
            const barWidth = 200;
            const barHeight = 10;
            const progressWidth = (barWidth * goal.progress) / 100;

            const barY = doc.y + 5;

            // Background
            doc.rect(50, barY, barWidth, barHeight)
                .fillColor('#e0e0e0')
                .fill();

            // Progress
            doc.rect(50, barY, progressWidth, barHeight)
                .fillColor('#4caf50')
                .fill();

            // Progress text
            doc.fillColor('#000000')
                .fontSize(9)
                .text(`${goal.progress}%`, 260, barY, { width: 50 });

            doc.moveDown(1.5);
        });

        doc.moveDown(1);
    }

    /**
     * Add sessions section
     */
    private addSessionsSection(doc: any, sessionsData: any[], includeTables: boolean) {
        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Video Sessions Summary');

        doc.moveDown(0.5);

        doc.fontSize(10)
            .font('Helvetica')
            .text(`Total Sessions: ${sessionsData.length}`);

        const analyzedCount = sessionsData.filter(s => s.status === 'analyzed').length;
        doc.text(`Analyzed Sessions: ${analyzedCount}`);

        doc.moveDown(1);

        if (includeTables) {
            // Table header
            const tableTop = doc.y;
            const col1 = 50;
            const col2 = 200;
            const col3 = 350;
            const col4 = 450;

            doc.fontSize(9)
                .font('Helvetica-Bold')
                .text('Date', col1, tableTop)
                .text('Action Type', col2, tableTop)
                .text('Status', col3, tableTop)
                .text('AI Score', col4, tableTop);

            doc.moveTo(50, tableTop + 15)
                .lineTo(550, tableTop + 15)
                .stroke();

            let rowY = tableTop + 20;

            sessionsData.slice(0, 10).forEach((session) => {
                if (rowY > 700) {
                    doc.addPage();
                    rowY = 50;
                }

                doc.fontSize(8)
                    .font('Helvetica')
                    .text(new Date(session.recordedAt).toLocaleDateString(), col1, rowY)
                    .text(session.actionType || 'N/A', col2, rowY, { width: 140, ellipsis: true })
                    .text(session.status, col3, rowY)
                    .text(session.aiConfidence ? `${session.aiConfidence}%` : 'N/A', col4, rowY);

                rowY += 20;
            });
        }

        doc.moveDown(2);
    }

    /**
     * Add therapist notes section
     */
    private addNotesSection(doc: any, notes: string) {
        if (doc.y > 650) {
            doc.addPage();
        }

        doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Clinical Notes');

        doc.moveDown(0.5);

        // Notes box
        doc.rect(50, doc.y, 500, 100)
            .fillColor('#f5f5f5')
            .fill()
            .strokeColor('#cccccc')
            .stroke();

        doc.fontSize(9)
            .fillColor('#000000')
            .font('Helvetica-Oblique')
            .text(notes, 60, doc.y - 90, { width: 480, align: 'left' });

        doc.moveDown(7);
    }

    /**
     * Add footer
     */
    private addFooter(doc: any, therapistName: string) {
        const pages = doc.bufferedPageRange();

        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);

            // Footer line
            doc.moveTo(50, 770)
                .lineTo(550, 770)
                .strokeColor('#cccccc')
                .lineWidth(1)
                .stroke();

            // Footer text
            doc.fontSize(8)
                .fillColor('#666666')
                .font('Helvetica')
                .text(`Page ${i + 1} of ${pages.count}`, 50, 780, { align: 'left' });

            doc.text(`Generated by: ${therapistName}`, 50, 780, { align: 'center' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 50, 780, { align: 'right' });
        }
    }

    /**
     * Add password protection to PDF
     */
    private async addPasswordProtection(pdfBuffer: Buffer, password: string): Promise<Buffer> {
        try {
            const pdfDoc = await PDFLib.load(pdfBuffer);

            // Encrypt the PDF with password
            (pdfDoc as any).encrypt({
                userPassword: password,
                ownerPassword: password + '_owner_key',
                permissions: {
                    printing: 'highResolution',
                    modifying: false,
                    copying: false,
                    annotating: false,
                    fillingForms: false,
                    contentAccessibility: true,
                    documentAssembly: false,
                },
            });

            const encryptedPdfBytes = await pdfDoc.save();
            return Buffer.from(encryptedPdfBytes);
        } catch (error) {
            console.error('Error adding password protection:', error);
            throw new Error('Failed to add password protection to PDF');
        }
    }
}
