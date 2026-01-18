export enum UserRole {
  THERAPIST = 'THERAPIST',
  CAREGIVER = 'CAREGIVER',
  ADMIN = 'ADMIN'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export enum Screen {
  // Auth
  LOGIN = 'LOGIN',
  THERAPIST_REGISTER = 'THERAPIST_REGISTER',
  CAREGIVER_REGISTER = 'CAREGIVER_REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',

  // Therapist Onboarding
  THERAPIST_ONBOARDING = 'THERAPIST_ONBOARDING',

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
  CAREGIVER_INVITATIONS = 'CAREGIVER_INVITATIONS',
  PATIENT_CREATE = 'PATIENT_CREATE',

  // Caregiver
  CAREGIVER_DASHBOARD = 'CAREGIVER_DASHBOARD',
  VIDEO_RECORDING = 'VIDEO_RECORDING',
  RECORDING_SCHEDULE = 'RECORDING_SCHEDULE',
  CAREGIVER_REPORTS = 'CAREGIVER_REPORTS',

  // Admin
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  THERAPIST_APPLICATIONS = 'THERAPIST_APPLICATIONS',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
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
  twoFactorMethod?: 'SMS' | 'EMAIL' | 'AUTHENTICATOR';
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
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
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

export type ASDLevel = 'Level 1' | 'Level 2' | 'Level 3';

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

export interface Patient {
  id: string;
  _id?: string; // MongoDB ID compatibility

  // ===== BASIC INFORMATION =====
  mrn: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
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
  status: 'Active' | 'Inactive' | 'Discharged';
  progressScore?: number;
  caregiverId?: string;
  caregiverName?: string;
  lastActivity?: string;

  createdAt?: string;
  updatedAt?: string;
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
