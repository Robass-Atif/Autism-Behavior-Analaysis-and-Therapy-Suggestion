export enum UserRole {
  THERAPIST = "THERAPIST",
  CAREGIVER = "CAREGIVER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  PENDING = "pending",
  PENDING_VERIFICATION = "pending_verification",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
  REVOKED = "revoked",
}

export enum Screen {
  // Auth
  LOGIN = "LOGIN",
  THERAPIST_REGISTER = "THERAPIST_REGISTER",
  CAREGIVER_REGISTER = "CAREGIVER_REGISTER",
  FORGOT_PASSWORD = "FORGOT_PASSWORD",
  RESET_PASSWORD = "RESET_PASSWORD",

  // Therapist Onboarding
  THERAPIST_ONBOARDING = "THERAPIST_ONBOARDING",

  // Therapist
  DASHBOARD = "DASHBOARD",
  PATIENT_LIST = "PATIENT_LIST",
  PATIENT_PROFILE = "PATIENT_PROFILE",
  THERAPY_GOALS = "THERAPY_GOALS",
  THERAPY_GOAL_FORM = "THERAPY_GOAL_FORM",
  VIDEO_LIBRARY = "VIDEO_LIBRARY",
  VIDEO_REVIEW = "VIDEO_REVIEW",
  INDIVIDUAL_REPORT = "INDIVIDUAL_REPORT",
  CONSOLIDATED_REPORT = "CONSOLIDATED_REPORT",
  RECOMMENDATIONS = "RECOMMENDATIONS",
  REPORT_GENERATION = "REPORT_GENERATION",
  DATA_EXPORT = "DATA_EXPORT",
  SETTINGS = "SETTINGS",
  CONSENT_MANAGEMENT = "CONSENT_MANAGEMENT",
  CAREGIVER_INVITATIONS = "CAREGIVER_INVITATIONS",
  PATIENT_CREATE = "PATIENT_CREATE",
  DIAGNOSTIC_REPORTS = "DIAGNOSTIC_REPORTS",

  // New: AI Review Workflow
  PENDING_REVIEW_QUEUE = "PENDING_REVIEW_QUEUE",
  SESSION_REPORT = "SESSION_REPORT",
  PATIENT_LONGITUDINAL = "PATIENT_LONGITUDINAL",

  // Caregiver
  CAREGIVER_DASHBOARD = "CAREGIVER_DASHBOARD",
  VIDEO_RECORDING = "VIDEO_RECORDING",
  RECORDING_SCHEDULE = "RECORDING_SCHEDULE",
  CAREGIVER_REPORTS = "CAREGIVER_REPORTS",

  // Admin
  ADMIN_DASHBOARD = "ADMIN_DASHBOARD",
  THERAPIST_APPLICATIONS = "THERAPIST_APPLICATIONS",
  USER_MANAGEMENT = "USER_MANAGEMENT",
  SYSTEM_HEALTH = "SYSTEM_HEALTH",
  AUDIT_LOG = "AUDIT_LOG",

  // Shared
  ERROR = "ERROR",
}

// ========== SESSION STATUS LIFECYCLE ==========
export type SessionStatus =
  | "pending_review"
  | "approved_for_ai"
  | "processing"
  | "completed"
  | "therapist_review"
  | "published"
  | "failed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  rejectionCount?: number;
}

export interface LoginUser {
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  onboardingCompleted?: boolean;
  [key: string]: any;
}

// Therapist specific interfaces
export interface TherapistRegistrationData {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  issuingAuthority: string;
  licenseExpiryDate: string;
  licenseCertificate?: File;
  organizationName: string;
  department?: string;
  workAddress: string;
  password: string;
  confirmPassword: string;
  reference1?: {
    name: string;
    email: string;
    phone: string;
  };
  reference2?: {
    name: string;
    email: string;
    phone: string;
  };
  agreeToTerms: boolean;
  agreeToHIPAA: boolean;
  agreeToPrivacy: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: "SMS" | "EMAIL" | "AUTHENTICATOR";
}

export interface TherapistOnboardingData {
  clinicName: string;
  clinicAddress: string;
  specialties: string[];
  bio?: string;
  workingHours: {
    start: string;
    end: string;
  };
  consultationFee?: number;
}

// Caregiver specific interfaces
export interface CaregiverRegistrationData {
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
  dateOfBirth?: string;
  relationshipType: string;
  invitationCode: string;
  password: string;
  confirmPassword: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  videoRecordingConsent?: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  sessionReminders: boolean;
}

export interface TherapistApplication {
  id: string;
  therapistId: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  licenseType: string;
  organizationName: string;
  submittedAt: string;
  status: UserStatus;
  licenseCertificate?: string;
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  EXPIRED = "EXPIRED",
}

export interface CaregiverInvitation {
  id: string;
  invitationCode: string;
  therapistId: string;
  therapistName: string;
  patientId: string;
  patientName: string;
  caregiverEmail: string;
  caregiverName?: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export type ASDLevel = "Level 1" | "Level 2" | "Level 3";

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
}

export interface CommunicationPreferences {
  emailUpdates: boolean;
  smsReminders: boolean;
  callReminders: boolean;
}

export interface AIConsentHistoryRecord {
  granted: boolean;
  version: string;
  timestamp: string;
  decidedBy: string;
}

export interface AIConsent {
  isGranted: boolean;
  lastUpdated?: string;
  versionAccepted?: string;
  history?: AIConsentHistoryRecord[];
}

export interface Patient {
  id: string;
  _id?: string; // MongoDB ID compatibility

  // ===== BASIC INFORMATION =====
  mrn: string;
  fullName: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  therapistId: string;

  // ===== CONTACT INFORMATION =====
  email?: string;
  phone?: string;
  address?: Address;
  preferredLanguage?: string;
  communicationPreferences?: CommunicationPreferences;

  // ===== EMERGENCY CONTACT =====
  emergencyContact?: EmergencyContact;

  // ===== MEDICAL INFORMATION =====
  diagnosisDate?: string;
  asdSeverity?: ASDLevel | string;
  diagnosisDetails?: string;
  primaryPhysician?: string;
  coOccurringConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  specialNeeds?: string;
  previousTherapies?: string[];

  // ===== INSURANCE INFORMATION =====
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;

  // ===== CLINICAL DETAILS =====
  referralSource?: string;
  admissionDate?: string;
  dischargeDate?: string;
  dischargeReason?: string;
  clinicalNotes?: string;
  caregiverNotes?: string;

  // ===== SYSTEM FIELDS =====
  status: "Active" | "Inactive" | "Discharged";
  progressScore?: number;
  caregiverId?: string;
  caregiverName?: string;
  lastActivity?: string;

  createdAt?: string;
  updatedAt?: string;
  latestClinicalReport?: AggregatedClinicalReport;
  isLatestClinicalReportPublished?: boolean;
  latestClinicalReportPublishedAt?: string;

  aiConsent: AIConsent;
}

export interface TherapyGoal {
  id: string;
  patientId: string;
  title: string;
  category: string;
  description: string;
  status:
    | "active"
    | "completed"
    | "achieved"
    | "on hold"
    | "archived"
    | "discontinued";
  progress: number;
  startDate: string;
  targetDate: string;
  priority: "high" | "medium" | "low";
}

// ========== AI PREDICTION TYPES (API 1) ==========

export interface EnsemblePrediction {
  severity: number;
  severity_confidence: number;
  social_affect: number;
  rrb: number;
  comparison_score: number;
  comparison_confidence: number;
  method: string;
}

export interface JointContribution {
  joint: string;
  contribution: number;
}

export interface TaskExplanation {
  prediction: number;
  baseline: number;
  confidence: {
    confidence_score: number;
    confidence_level: string;
    prediction_std: number;
    prediction_mean: number;
  };
  joints: {
    positive_contributors: JointContribution[];
    negative_contributors: JointContribution[];
  };
  temporal_segments: {
    positive_segments: any[];
    negative_segments: any[];
    all_segments: any[];
  };
  demographic_contributions: {
    age_contribution: number;
    gender_contribution: number;
  };
  total_sequence_attribution: number;
  total_demographic_attribution: number;
}

export interface ModelPrediction {
  severity: number;
  severity_confidence: number;
  social_affect: number;
  rrb: number;
  comparison_score: number;
  comparison_confidence: number;
  input_age: number;
  input_gender: string;
  model_type: string;
  sequence_length: number;
  explainability: {
    predictions: Record<string, number>;
    video_metadata: {
      duration_seconds: number;
      num_frames: number;
      fps: number;
    };
    task_explanations: {
      Severity: TaskExplanation;
      "Social Affect": TaskExplanation;
      RRB: TaskExplanation;
      "Comparison Score": TaskExplanation;
    };
    summary: string;
  };
}

export interface RawPredictionResponse {
  predictions_2d: ModelPrediction;
  predictions_3d: ModelPrediction;
  ensemble_prediction: EnsemblePrediction;
  input_age: number;
  input_gender: string;
  status: string;
  processing_info: {
    input_type: string;
    video_duration_seconds: number;
    original_fps: number;
    frames_extracted: number;
    poses_2d_extracted: number;
    "3d_processing_enabled": boolean;
    poses_3d_extracted: number;
  };
}

// ========== CLINICAL REPORT TYPES (API 2) ==========

export interface TherapyRecommendation {
  therapy_name: string;
  summary: string;
  evidence_basis: string;
  relevance_score: number;
  intervention_targets: string;
}

export interface DSM5Classification {
  level: string;
  social_communication: string;
  restricted_behaviors: string;
}

export interface NICEGuidelines {
  support_needs_profile: {
    communication: string;
    social_interaction: string;
    behavioral_flexibility: string;
    support_intensity: string;
  };
  allowed_intervention_categories: string[];
  recommended_characteristics: {
    intensity: string;
    setting: string[];
    format: string[];
    provider: string[];
  };
  explicit_exclusions: string[];
  notes: string;
}

export interface ClinicalReportData {
  metadata: {
    generated_at: string;
    report_type: string;
    version: string;
  };
  patient_info: {
    age: number;
    gender: string;
  };
  assessment_results: {
    severity_level: number;
    severity_confidence: number;
    scores: {
      ensemble: {
        social_affect: number;
        rrb: number;
        comparison_score: number;
        comparison_confidence: number;
      };
      model_2d: {
        social_affect: number;
        rrb: number;
        comparison_score: number;
        severity_confidence: number;
      };
      model_3d: {
        social_affect: number;
        rrb: number;
        comparison_score: number;
        severity_confidence: number;
      };
    };
  };
  clinical_report: string; // markdown narrative
  therapies_recommended: TherapyRecommendation[];
  recommended_interventions?: any[];
  dsm5_classification: DSM5Classification;
  nice_guidelines: NICEGuidelines;
  retrieved_chunks?: any[];
}

export interface AggregatedClinicalReport {
  clinical_report: string;
  retrieved_chunks: any[];
  therapy_metadata: any;
  therapies_recommended: Array<{
    therapy_name: string;
    summary: string;
    evidence_basis: string;
    relevance_score: number;
    intervention_targets: string;
  }>;
  sessions_included: Array<{
    sessionId: string;
    recordedAt: string;
    actionType: string;
  }>;
  generated_at: string;
}

// ========== THERAPIST REVIEW ==========

export interface TherapistReview {
  overrideSeverity?: number;
  originalAISeverity?: number;
  isOverridden: boolean;
  reviewNotes: string;
  therapyPlanAdjustments: string;
  reviewedAt: string;
  reviewedBy?: string;
  overriddenAt?: string;
}

// ========== VIDEO SESSION (UPDATED) ==========

export interface VideoSession {
  id: string;
  _id?: string; // MongoDB compatibility
  patientId: string;
  patientName: string;
  recordedAt: string;
  duration: number;
  actionType: string;
  qualityScore: "high" | "medium" | "low";
  status: SessionStatus;
  uploadedBy?: "therapist" | "caregiver";

  // AI results
  aiConfidence?: number;
  aiAnalysis?: {
    behaviors: Array<{
      type: string;
      timestamp: number;
      confidence: number;
      severity: string;
    }>;
    summary: string;
    recommendations: string[];
  };
  rawPredictionResponse?: RawPredictionResponse;
  ensemblePrediction?: EnsemblePrediction;
  clinicalReport?: ClinicalReportData;

  // Therapist review
  therapistReview?: TherapistReview;
  therapistNotes?: string;
  reviewed?: boolean;
  reviewedAt?: string;

  // Publishing
  publishedAt?: string;
  publishedBy?: string;

  // Retry & Cancel tracking
  retryCount?: number;
  maxRetries?: number;
  lastError?: string;
  cancelledAt?: string;

  // Media
  videoUrl?: string;
  thumbnailUrl?: string;
  caregiverId?: string;
  caregiverName?: string;
  caregiverEmail?: string;

  createdAt?: string;
}

// ========== LONGITUDINAL DATA ==========

export interface LongitudinalDataPoint {
  sessionId: string;
  date: string;
  actionType: string;
  status: SessionStatus;
  severity: number;
  aiSeverity: number;
  isOverridden: boolean;
  social_affect: number;
  rrb: number;
  comparison_score: number;
  severity_confidence: number;
  comparison_confidence: number;
}

export interface PatientLongitudinalData {
  patientId: string;
  totalSessions: number;
  trendData: LongitudinalDataPoint[];
}

// ========== OTHER ==========

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  resource: string;
  status: "Success" | "Failure";
  details: string;
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  pendingReviews: number;
  reportsGenerated: number;
  avgProgress: number;
}