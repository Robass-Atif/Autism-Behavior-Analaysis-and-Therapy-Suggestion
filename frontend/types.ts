export enum UserRole {
  THERAPIST = 'THERAPIST',
  CAREGIVER = 'CAREGIVER',
  ADMIN = 'ADMIN'
}

export enum Screen {
  // Auth
  LOGIN = 'LOGIN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
  
  // Therapist
  DASHBOARD = 'DASHBOARD',
  PATIENT_LIST = 'PATIENT_LIST',
  PATIENT_PROFILE = 'PATIENT_PROFILE',
  THERAPY_GOALS = 'THERAPY_GOALS',
  THERAPY_GOAL_FORM = 'THERAPY_GOAL_FORM',
  VIDEO_LIBRARY = 'VIDEO_LIBRARY',
  VIDEO_REVIEW = 'VIDEO_REVIEW',
  INDIVIDUAL_REPORT = 'INDIVIDUAL_REPORT',
  CONSOLIDATED_REPORT = 'CONSOLIDATED_REPORT',
  RECOMMENDATIONS = 'RECOMMENDATIONS',
  REPORT_GENERATION = 'REPORT_GENERATION',
  DATA_EXPORT = 'DATA_EXPORT',
  SETTINGS = 'SETTINGS',
  CONSENT_MANAGEMENT = 'CONSENT_MANAGEMENT',

  // Caregiver
  CAREGIVER_DASHBOARD = 'CAREGIVER_DASHBOARD',
  VIDEO_RECORDING = 'VIDEO_RECORDING',
  RECORDING_SCHEDULE = 'RECORDING_SCHEDULE',
  CAREGIVER_REPORTS = 'CAREGIVER_REPORTS',

  // Admin
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  AUDIT_LOG = 'AUDIT_LOG',

  // Shared
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export type ASDLevel = 'Level 1' | 'Level 2' | 'Level 3';

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  dob: string;
  gender: string;
  diagnosisDate: string;
  asdSeverity: ASDLevel;
  caregiverId: string;
  caregiverName: string;
  status: 'Active' | 'Archived' | 'Pending';
  lastActivity: string;
  progressScore: number;
  coOccurringConditions: string[];
}

export interface TherapyGoal {
  id: string;
  patientId: string;
  title: string;
  category: string;
  description: string;
  status: 'Active' | 'Achieved' | 'On Hold' | 'Discontinued';
  progress: number;
  startDate: string;
  targetDate: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface VideoSession {
  id: string;
  patientId: string;
  patientName: string;
  recordedAt: string;
  duration: number;
  actionType: string;
  qualityScore: 'High' | 'Medium' | 'Low';
  status: 'Processing' | 'Analyzed' | 'Reviewed';
  aiConfidence: number;
  thumbnailUrl?: string;
  caregiverName?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  resource: string;
  status: 'Success' | 'Failure';
  details: string;
}

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  pendingReviews: number;
  reportsGenerated: number;
  avgProgress: number;
}
