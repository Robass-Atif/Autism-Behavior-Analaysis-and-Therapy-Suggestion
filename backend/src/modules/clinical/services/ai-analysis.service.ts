import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { HttpService } from '@nestjs/axios'
import { Model } from 'mongoose'
import { VideoSession } from '../schemas/video-session.schema'
import { Patient } from '../../patients/schemas/patient.schema'
import { join } from 'path'
import { firstValueFrom } from 'rxjs'
import * as FormData from 'form-data'
import * as fs from 'fs'
import { CryptoService } from '../../../common/services/crypto.service'
import * as crypto from 'crypto'

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name)
  private readonly aiUrl: string
  private readonly therapyUrl: string

  /**
   * Initializes the AI Analysis Service
   * @param {ConfigService} configService - The configuration service
   * @param {HttpService} httpService - The HTTP service
   * @param {CryptoService} cryptoService - The crypto service
   * @param {Model<VideoSession>} videoSessionModel - The video session model
   * @param {Model<Patient>} patientModel - The patient model
   */
  constructor (
    private configService: ConfigService,
    private httpService: HttpService,
    private cryptoService: CryptoService,
    @InjectModel(VideoSession.name)
    private videoSessionModel: Model<VideoSession>,
    @InjectModel(Patient.name)
    private patientModel: Model<Patient>
  ) {
    const baseUrl =
      this.configService.get<string>('PREDICTION_SERVICE_URL') ||
      'http://localhost:8000'

    // Support both full /predict URL and base URL formats
    const sanitizedBaseUrl = baseUrl
      .replace(/\/+$/, '')
      .replace(/\/predict$/, '')
    this.aiUrl = `${sanitizedBaseUrl}/predict`
    this.therapyUrl = `${sanitizedBaseUrl}/therapy/recommend`

    this.logger.log(`🛠️ AI Analysis Service initialized:`)
    this.logger.log(`   - Raw Config URL: ${baseUrl}`)
    this.logger.log(`   - Sanitized Base: ${sanitizedBaseUrl}`)
    this.logger.log(`   - Prediction Endpoint: ${this.aiUrl}`)
    this.logger.log(`   - Therapy Endpoint: ${this.therapyUrl}`)
  }

  /**
   * Triggers analysis by calling the external FastAPI service
   * @param sessionId The ID of the video session to analyze
   */
  async analyzeVideo (sessionId: string): Promise<void> {
    const session = await this.videoSessionModel
      .findById(sessionId)
      .populate('patientId')
    if (!session) {
      this.logger.error(`Session not found: ${sessionId}`)
      return
    }

    try {
      this.logger.log(
        `Initiating AI analysis for session ${sessionId} via FastAPI`
      )

      const videoPath = join(process.cwd(), session.videoUrl)

      // Fail fast if the video file is missing
      if (!fs.existsSync(videoPath)) {
        throw new Error(
          `Video file not found at path: ${videoPath}. The file may have been deleted.`
        )
      }

      // Execute retry logic loop
      await this.performAnalysisRequest(session, videoPath)
    } catch (error: any) {
      this.logger.error(
        `Failed to trigger analysis for session ${sessionId}:`,
        error
      )
      session.status = 'failed'
      session.lastError = error?.message || 'Failed to trigger AI analysis'
      await session.save()
    }
  }

  /**
   * Internal method to handle the actual HTTP request to FastAPI
   */
  private async performAnalysisRequest (session: any, videoPath: string) {
    const sessionId = session._id.toString()
    const maxRetries = session.maxRetries || 3
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          ` AI Request attempt ${attempt}/${maxRetries} for ${sessionId} at ${this.aiUrl}`
        )

        const payload = new FormData()

        // Read the actual video file into a buffer to send as multipart form-data
        const rawBuffer = fs.readFileSync(videoPath)
        let videoBuffer = rawBuffer

        // Decrypt if necessary
        if (
          session.encryptionKeyPattern &&
          session.encryptionIV &&
          session.encryptionAuthTag
        ) {
          this.logger.log(
            `🔐 Decrypting video buffer for session ${sessionId}...`
          )
          try {
            const fileKey = this.cryptoService.decryptFileKey(
              session.encryptionKeyPattern
            )
            const iv = Buffer.from(session.encryptionIV, 'base64')
            const authTag = Buffer.from(session.encryptionAuthTag, 'base64')

            const decipher = crypto.createDecipheriv('aes-256-gcm', fileKey, iv)
            decipher.setAuthTag(authTag)

            videoBuffer = Buffer.concat([
              decipher.update(rawBuffer),
              decipher.final()
            ])
            this.logger.log(`🔓 Decryption successful for session ${sessionId}`)
          } catch (decryptError) {
            this.logger.error(
              `❌ Decryption failed for session ${sessionId}:`,
              decryptError
            )
            throw new Error(
              `Failed to decrypt video session: ${decryptError.message}`
            )
          }
        }

        // Force supported extension — FastAPI accepts .mp4/.avi/.mov/.webm
        let originalName = session.videoUrl.split('/').pop() || 'video.mp4'
        if (!originalName.match(/\.(mp4|avi|mov|webm)$/i)) {
          originalName = originalName.replace(/\.[^.]+$/, '.mp4')
        }

        payload.append('input_file', videoBuffer, {
          filename: originalName,
          contentType: 'video/mp4'
        })

        payload.append('age', session.patientId?.age?.toString() || '5')

        let genderStr = session.patientId?.gender || 'M'
        // FastAPI requires strictly 'M' or 'F'
        if (typeof genderStr === 'string' && genderStr.length > 0) {
          genderStr = genderStr.charAt(0).toUpperCase()
        }
        if (genderStr !== 'M' && genderStr !== 'F') {
          genderStr = 'M' // Default to M
        }

        payload.append('gender', genderStr)

        const apiKey =
          this.configService.get<string>('X-API-KEY') ||
          this.configService.get<string>('X-API-Key') ||
          'your-api-key-change-this-please'

        const response = await firstValueFrom(
          this.httpService.post(this.aiUrl, payload, {
            headers: {
              'X-API-Key': apiKey,
              ...payload.getHeaders()
            }
          })
        )

        this.logger.log(
          `✅ AI Backend response received for session ${sessionId}`
        )

        const data = response.data

        if (data) {
          const pred =
            data.ensemble_prediction ||
            data.predictions_2d ||
            data.predictions_3d ||
            {}
          const hasError = pred?.error
          const severity = pred?.severity ?? null
          const severityConfidence = pred?.severity_confidence ?? 0
          const socialAffect = pred?.social_affect ?? 0
          const rrb = pred?.rrb ?? 0
          const comparisonScore = pred?.comparison_score ?? 0

          // Map severity level to label based on clinical guidelines
          const severityLabels = [
            'Autism Spectrum Disorder (Mild)',
            'Autism (Severe)'
          ]
          const severityLabel =
            severity !== null
              ? severityLabels[severity] ||
                (severity === 0
                  ? 'Autism Spectrum Disorder (Mild)'
                  : 'Autism (Severe)')
              : 'Unknown'

          // Generate meaningful behaviors from the model output
          const behaviors: any[] = []
          if (!hasError) {
            behaviors.push({
              type: 'Social Affect',
              confidence: Math.min(severityConfidence, 1),
              timestamp: 0,
              severity:
                socialAffect >= 21
                  ? 'High'
                  : socialAffect >= 11
                  ? 'Medium'
                  : 'Low',
              score: socialAffect
            })
            behaviors.push({
              type: 'Restricted & Repetitive Behaviors',
              confidence: Math.min(severityConfidence, 1),
              timestamp: 0,
              severity: rrb > 8 ? 'High' : rrb >= 4 ? 'Medium' : 'Low',
              score: rrb
            })
          }

          // Generate summary
          const summary = hasError
            ? `Analysis completed with limited data quality. ${pred.error}`
            : `ADOS-2 assessment indicates ${severityLabel} severity (Level ${severity}). ` +
              `Social Affect score: ${socialAffect.toFixed(
                1
              )}, RRB score: ${rrb.toFixed(1)}. ` +
              `Confidence: ${(severityConfidence * 100).toFixed(0)}%.`

          // Generate recommendations based on severity
          const recommendations: string[] = []
          if (severity !== null) {
            if (severity >= 1) {
              recommendations.push('Immediate clinical assessment recommended')
              recommendations.push(
                'Consider intensive behavioral intervention (ABA therapy)'
              )
              recommendations.push('Schedule follow-up within 2 weeks')
            } else {
              recommendations.push(
                'Continue monitoring with regular assessments'
              )
              recommendations.push(
                'Consider targeted social skills intervention'
              )
              recommendations.push('Schedule follow-up within 4 weeks')
            }
          }

          // session.status = "completed"; // MOVE THIS TO AFTER RAG
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
          }
          session.aiConfidence = hasError
            ? 50
            : Math.round(severityConfidence * 100)

          // Persist the complete raw model payload for PDF/report drill-down sections.
          session.rawPredictionResponse = {
            ...data
          }

          // Build ensemble prediction (use primary model data)
          const ensemble = data.ensemble_prediction || pred
          session.ensemblePrediction = {
            severity: ensemble.severity ?? severity,
            severity_confidence:
              ensemble.severity_confidence ?? severityConfidence,
            social_affect: ensemble.social_affect ?? socialAffect,
            rrb: ensemble.rrb ?? rrb,
            comparison_score: ensemble.comparison_score ?? comparisonScore,
            comparison_confidence: ensemble.comparison_confidence ?? 0,
            method: data.ensemble_prediction
              ? 'average'
              : data.predictions_2d
              ? '2D'
              : '3D'
          }

          // Generate baseline clinical report (DSM-5 classification)
          session.clinicalReport = {
            dsm5_classification: {
              level:
                severity === 1
                  ? 'Autism (Severe)'
                  : 'Autism Spectrum Disorder (Mild)',
              social_communication:
                socialAffect >= 21
                  ? 'High (2)'
                  : socialAffect >= 11
                  ? 'Medium (1)'
                  : 'Low (0)',
              restricted_behaviors:
                rrb > 8 ? 'High (2)' : rrb >= 4 ? 'Medium (1)' : 'Low (0)'
            },
            recommended_interventions: recommendations.map((rec, i) => ({
              name: rec,
              priority: i === 0 ? 'high' : 'medium',
              description: rec
            }))
          }

          session.retryCount = attempt - 1
          session.lastError = undefined
          await session.save()

          this.logger.log(
            `AI results updated for session ${sessionId} — Severity: ${severityLabel}`
          )

          // Finalize session status
          session.status = 'completed'
          await session.save()

          return // exit the retry loop on success
        } else {
          throw new Error('No valid analysis results returned from FastAPI')
        }
      } catch (error: any) {
        lastError = error
        const errorMsg = 
          error.response?.data?.detail || 
          (typeof error.response?.data === 'string' ? error.response.data : null) ||
          error.response?.data?.message ||
          error?.message || 
          error?.toString() || 
          'Unknown error';

        this.logger.error(
          `❌ AI Request attempt ${attempt}/${maxRetries} failed: ${errorMsg}`
        )

        session.retryCount = attempt
        session.lastError = errorMsg
        await session.save()

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          this.logger.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Exhausted all retries
    const sessionToUpdate = await this.videoSessionModel.findById(sessionId)
    if (sessionToUpdate) {
      sessionToUpdate.status = 'failed'
      sessionToUpdate.lastError = 
        lastError?.response?.data?.detail || 
        (typeof lastError?.response?.data === 'string' ? lastError.response.data : null) ||
        lastError?.message || 
        'All retry attempts exhausted';
      await sessionToUpdate.save()
    }
  }

  /**
   * On-demand trigger: fetch therapy recommendations for a session
   */
  async generateTherapyRecommendation (
    sessionId: string
  ): Promise<Record<string, any>> {
    this.logger.log(
      `🎯 Explicit trigger for therapy recommendation: session ${sessionId}`
    )
    return this.fetchTherapyRecommendation(sessionId)
  }

  /**
   * Aggregates all completed video analysis sessions for a patient
   * and sends the merged results to the therapy RAG pipeline.
   */
  async fetchAggregatedTherapyRecommendation (
    patientId: string
  ): Promise<Record<string, any>> {
    const { Types } = require('mongoose')
    this.logger.log(`🎯 Aggregating analysis results for patient: ${patientId}`)

    const patient = await this.patientModel.findById(patientId)
    if (!patient) {
      throw new Error(`Patient not found: ${patientId}`)
    }

    // Fetch all completed or published sessions for this patient
    const sessions = await this.videoSessionModel
      .find({
        patientId: patientId,
        status: { $in: ['completed', 'published'] },
        isApprovedForTherapy: true,
        isUsedForTherapy: { $ne: true },
        deleted: false
      })
      .sort({ recordedAt: 1 }) // Chronological order

    if (sessions.length === 0) {
      throw new Error(
        'No completed or published AI analysis sessions found for this patient.'
      )
    }

    this.logger.log(
      `📊 Found ${sessions.length} sessions (completed/published) to aggregate.`
    )

    // Map sessions to a list of raw predictions
    const aggregatedPayload = sessions
      .map(s => s.rawPredictionResponse)
      .filter(Boolean)

    if (aggregatedPayload.length === 0) {
      throw new Error('None of the analyzed sessions contain prediction data.')
    }

    const apiKey =
      this.configService.get<string>('X-API-KEY') ||
      this.configService.get<string>('X-API-Key') ||
      'your-api-key-change-this-please'

    this.logger.log(
      `🧬 clinical_rag_pipeline (Aggregated): patient ${patientId} at ${this.therapyUrl}`
    )

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.therapyUrl, aggregatedPayload, {
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
          timeout: 120_000
        })
      )

      const therapyData = response.data
      if (!therapyData) {
        throw new Error('Empty response from therapy recommendation endpoint')
      }

      this.logger.log(
        `✅ Aggregated therapy recommendations received for patient ${patientId}`
      )

      // Save to Patient Model as the "latest clinical profile"
      const report = {
        clinical_report: therapyData.clinical_report || null,
        retrieved_chunks: therapyData.retrieved_chunks || [],
        therapy_metadata: therapyData.metadata || null,
        therapies_recommended:
          therapyData.therapies_recommended ||
          this.parseTherapiesFromReport(therapyData.clinical_report),
        sessions_included: sessions.map(s => ({
          sessionId: s._id,
          recordedAt: s.recordedAt,
          actionType: s.actionType,
          status: s.status,
          analyzed: !!s.clinicalReport
        })),
        generated_at: new Date().toISOString()
      }

      patient.latestClinicalReport = report
      await patient.save()

      // Mark sessions as used so they are not included in the next generation
      const sessionIds = sessions.map(s => s._id)
      await this.videoSessionModel.updateMany(
        { _id: { $in: sessionIds } },
        { $set: { isUsedForTherapy: true } }
      )

      return report
    } catch (error: any) {
      this.logger.error(
        `❌ Aggregated Therapy RAG FAILED for patient ${patientId} - URL: ${this.therapyUrl}`
      )
      this.logger.error(`   - Error: ${error.message}`)
      throw error
    }
  }

  /**
   * Calls the FastAPI /therapy/recommend endpoint
   */
  async fetchTherapyRecommendation (
    sessionId: string,
    predictionPayload?: Record<string, any>
  ): Promise<Record<string, any>> {
    const session = await this.videoSessionModel
      .findById(sessionId)
      .populate('patientId')
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const payload = predictionPayload || session.rawPredictionResponse
    if (!payload) {
      throw new Error(`No prediction data available for session ${sessionId}`)
    }

    const apiKey =
      this.configService.get<string>('X-API-KEY') ||
      this.configService.get<string>('X-API-Key') ||
      'your-api-key-change-this-please'

    this.logger.log(
      `🧬 clinical_rag_pipeline: session ${sessionId} at ${this.therapyUrl}`
    )

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.therapyUrl, payload, {
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
          timeout: 120_000
        })
      )

      const therapyData = response.data

      if (!therapyData) {
        throw new Error('Empty response from therapy recommendation endpoint')
      }

      this.logger.log(
        `✅ Therapy recommendations received for session ${sessionId}`
      )

      const existingReport =
        (session.clinicalReport as Record<string, any>) || {}
      session.clinicalReport = {
        ...existingReport,
        clinical_report: therapyData.clinical_report || null,
        retrieved_chunks: therapyData.retrieved_chunks || [],
        therapy_metadata: therapyData.metadata || null,
        therapies_recommended:
          therapyData.therapies_recommended ||
          this.parseTherapiesFromReport(therapyData.clinical_report),
        rag_generated_at: new Date().toISOString()
      }

      await session.save()
      return session.clinicalReport as Record<string, any>
    } catch (error: any) {
      this.logger.error(
        `❌ Therapy RAG FAILED for session ${sessionId} - URL: ${this.therapyUrl}`
      )
      this.logger.error(`   - Status: ${error.response?.status}`)
      this.logger.error(`   - Error: ${error.message}`)
      if (error.response?.data) {
        this.logger.error(
          `   - Response Data: ${JSON.stringify(error.response.data)}`
        )
      }
      throw error
    }
  }

  /**
   * Extracts structured therapy objects from markdown report.
   */
  private parseTherapiesFromReport (
    markdownReport?: string
  ): Array<Record<string, any>> {
    if (!markdownReport) return []

    const therapies: Array<Record<string, any>> = []
    const headingRegex = /^#{2,4}\s*(?:\d+\.?\s*)?(.+?)$/gm
    let match: RegExpExecArray | null

    while ((match = headingRegex.exec(markdownReport)) !== null) {
      const name = match[1].trim()
      if (
        /^(summary|overview|conclusion|reference|source|note|patient|clinical)/i.test(
          name
        )
      )
        continue

      const startIdx = match.index + match[0].length
      const nextHeading = markdownReport.indexOf('\n#', startIdx)
      const sectionText =
        nextHeading > -1
          ? markdownReport.slice(startIdx, nextHeading).trim()
          : markdownReport.slice(startIdx).trim()

      if (sectionText.length > 15) {
        therapies.push({
          therapy_name: name,
          summary: sectionText.slice(0, 2500),
          evidence_basis: sectionText.slice(0, 1500),
          relevance_score: 0.85,
          intervention_targets: 'Derived from RAG clinical guidelines.'
        })
      }
    }

    return therapies
  }
}
