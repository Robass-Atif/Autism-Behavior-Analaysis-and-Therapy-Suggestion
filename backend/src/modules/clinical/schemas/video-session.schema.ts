import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VideoSession extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  therapistId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  caregiverId: Types.ObjectId;

  @Prop({ required: true })
  videoUrl: string;

  @Prop({ type: String })
  thumbnailUrl: string;

  @Prop({ type: Date, required: true })
  recordedAt: Date;

  @Prop({ type: Number, required: true }) // in seconds
  duration: number;

  @Prop({ type: String })
  actionType: string;

  @Prop({ enum: ['high', 'medium', 'low'], default: 'medium' })
  qualityScore: string;

  // ========== STATUS LIFECYCLE ==========
  // pending_review → approved_for_ai → processing → completed → therapist_review → published
  @Prop({
    enum: ['pending_review', 'approved_for_ai', 'processing', 'completed', 'therapist_review', 'published', 'failed'],
    default: 'pending_review',
  })
  status: string;

  // ========== RETRY & CANCEL TRACKING ==========

  @Prop({ type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: Number, default: 3 })
  maxRetries: number;

  @Prop({ type: String })
  lastError: string;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy: Types.ObjectId;

  // Who uploaded: 'therapist' | 'caregiver'
  @Prop({ type: String, enum: ['therapist', 'caregiver'], default: 'therapist' })
  uploadedBy: string;

  // ========== AI ANALYSIS RESULTS ==========

  @Prop({ type: Number, min: 0, max: 100 })
  aiConfidence: number;

  // Legacy field — kept for backward compatibility
  @Prop({ type: Object })
  aiAnalysis: {
    behaviors: Array<{
      type: string;
      timestamp: number;
      confidence: number;
      severity: string;
    }>;
    summary: string;
    recommendations: string[];
  };

  // Full raw API 1 response (predictions_2d, predictions_3d, ensemble_prediction, processing_info)
  // Stored for audit purposes — never modified after initial save
  @Prop({ type: Object })
  rawPredictionResponse: Record<string, any>;

  // Extracted ensemble prediction for quick access (primary clinical decision layer)
  @Prop({ type: Object })
  ensemblePrediction: {
    severity: number;
    severity_confidence: number;
    social_affect: number;
    rrb: number;
    comparison_score: number;
    comparison_confidence: number;
    method: string;
  };

  // Full raw API 2 response (clinical_report.json)
  // Stored for audit purposes — never modified after initial save
  @Prop({ type: Object })
  clinicalReport: Record<string, any>;

  // ========== THERAPIST REVIEW ==========

  @Prop({ type: Object })
  therapistReview: {
    overrideSeverity?: number;
    originalAISeverity?: number;
    isOverridden: boolean;
    reviewNotes: string;
    therapyPlanAdjustments: string;
    reviewedAt: Date;
    reviewedBy: Types.ObjectId;
    overriddenAt?: Date;
  };

  @Prop({ type: String })
  therapistNotes: string;

  @Prop({ type: Boolean, default: false })
  reviewed: boolean;

  @Prop({ type: Date })
  reviewedAt: Date;

  // ========== PUBLISH TRACKING ==========

  @Prop({ type: Date })
  publishedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  publishedBy: Types.ObjectId;

  // ========== SOFT DELETE ==========

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const VideoSessionSchema = SchemaFactory.createForClass(VideoSession);
