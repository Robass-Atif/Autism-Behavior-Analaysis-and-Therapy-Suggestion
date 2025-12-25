export enum Role {
  THERAPIST = 'therapist',
  CAREGIVER = 'caregiver',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum AdminLevel {
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  SECURITY_ADMIN = 'security_admin',
  READ_ONLY_ADMIN = 'read_only_admin',
}

export enum TherapistTitle {
  CLINICAL_PSYCHOLOGIST = 'Clinical Psychologist',
  BEHAVIORAL_THERAPIST = 'Behavioral Therapist',
  OCCUPATIONAL_THERAPIST = 'Occupational Therapist',
  SPEECH_THERAPIST = 'Speech Therapist',
  OTHER = 'Other',
}

export enum LicenseType {
  BCBA = 'BCBA',
  LCSW = 'LCSW',
  CLINICAL_PSYCHOLOGIST = 'Clinical Psychologist License',
  OTHER = 'Other',
}

export enum RelationshipType {
  PARENT = 'Parent',
  GUARDIAN = 'Guardian',
  FAMILY_MEMBER = 'Family Member',
  PROFESSIONAL_CAREGIVER = 'Professional Caregiver',
  TEACHER_EDUCATOR = 'Teacher/Educator',
  OTHER = 'Other',
}

export enum TwoFactorMethod {
  SMS = 'sms',
  EMAIL = 'email',
  AUTHENTICATOR = 'authenticator',
}

export enum AccountStatus {
  PENDING_VERIFICATION = 'pending_verification',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

export enum Language {
  ENGLISH = 'English',
  SPANISH = 'Spanish',
  URDU = 'Urdu',
  OTHER = 'Other',
}
