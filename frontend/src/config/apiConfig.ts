// API Configuration
// All API endpoints should use these base URLs

// For development - change this to your actual backend URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
export const BASE_HOST = API_BASE_URL.replace('/api', '');

// Auth Module
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  CHECK_REGISTRATION_ELIGIBILITY: '/auth/check-registration-eligibility',
  REGISTER_THERAPIST: '/auth/register/therapist',
  REGISTER_CAREGIVER: '/auth/register/caregiver',
  REGISTER_ADMIN: '/auth/register/admin',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  COMPLETE_ONBOARDING: '/auth/complete-onboarding',
  ME: '/auth/me',
  LOGOUT: '/auth/logout',
};

// Patients Module
export const PATIENTS_ENDPOINTS = {
  CREATE: '/patients',
  GET_THERAPIST_PATIENTS: '/patients/therapists/me/patients',
  GET_CAREGIVER_PATIENTS: '/patients/caregivers/me/patients',
  GET_PATIENT: (id: string) => `/patients/${id}`,
  UPDATE_PATIENT: (id: string) => `/patients/${id}`,
  DELETE_PATIENT: (id: string) => `/patients/${id}`,
};

// Invitations Module
export const INVITATIONS_ENDPOINTS = {
  CREATE: '/invitations',
  VALIDATE: '/invitations/validate',
  LIST: '/invitations',
  RESEND: (id: string) => `/invitations/${id}/resend`,
  REVOKE: (id: string) => `/invitations/${id}/revoke`,
  VALIDATE_CODE: (code: string) => `/invitations/validate/${code}`,
  DELETE: (id: string) => `/invitations/${id}`,
};

// Admin Module
export const ADMIN_ENDPOINTS = {
  GET_THERAPIST_APPLICATIONS: '/admin/therapist-applications',
  APPROVE_THERAPIST_APPLICATION: (id: string) => `/admin/therapist-applications/${id}/approve`,
  REJECT_THERAPIST_APPLICATION: (id: string) => `/admin/therapist-applications/${id}/reject`,
  SUSPEND_USER: (id: string) => `/admin/users/${id}/suspend`,
  ACTIVATE_USER: (id: string) => `/admin/users/${id}/activate`,
  DELETE_THERAPIST: (id: string) => `/admin/therapists/${id}`,
  GET_ADMIN_PATIENTS: '/admin/patients',
  // User management endpoints
  GET_ADMIN_USERS: '/admin/users',
  GET_ADMIN_USER: (id: string) => `/admin/users/${id}`,
  GET_ADMIN_USER_DETAILS: (id: string) => `/admin/users/${id}/details`,
  UPDATE_USER: (id: string) => `/admin/users/${id}`,
  DELETE_USER: (id: string) => `/admin/users/${id}`,
  // Audit logs and System Health
  GET_AUDIT_LOGS: '/admin/audit-logs',
  GET_SYSTEM_HEALTH: '/admin/system-health',
};

// Users Module
export const USERS_ENDPOINTS = {
  LIST: '/users',
  GET_PENDING_APPROVALS: '/users/pending-approvals',
  GET_ME: '/users/me',
  GET_USER: (id: string) => `/users/${id}`,
  APPROVE_USER: (id: string) => `/users/${id}/approve`,
  REJECT_USER: (id: string) => `/users/${id}/reject`,
  UPDATE_USER_STATUS: (id: string) => `/users/${id}/status`,
  DELETE_USER: (id: string) => `/users/${id}`,
};

// Upload Module
export const UPLOAD_ENDPOINTS = {
  UPLOAD_LICENSE: '/upload/license',
  UPLOAD_SIGNATURE: '/upload/signature',
  GET_FILE: (type: string, filename: string) => `/upload/${type}/${filename}`,
};

// Health Module
export const HEALTH_ENDPOINTS = {
  CHECK: '/health',
};

// Therapy Goals Module (BACKEND IMPLEMENTED)
export const THERAPY_GOALS_ENDPOINTS = {
  CREATE: '/therapy-goals',
  LIST: '/therapy-goals',
  GET_STATS: '/therapy-goals/stats',
  GET: (id: string) => `/therapy-goals/${id}`,
  UPDATE: (id: string) => `/therapy-goals/${id}`,
  DELETE: (id: string) => `/therapy-goals/${id}`,
};

// Clinical Module (Video Sessions - BACKEND NOT IMPLEMENTED)
export const CLINICAL_ENDPOINTS = {
  // Therapy Goals - USE THERAPY_GOALS_ENDPOINTS above
  CREATE_THERAPY_GOAL: '/therapy-goals',
  LIST_THERAPY_GOALS: '/therapy-goals',
  GET_THERAPY_GOAL: (id: string) => `/therapy-goals/${id}`,
  UPDATE_THERAPY_GOAL: (id: string) => `/therapy-goals/${id}`,
  DELETE_THERAPY_GOAL: (id: string) => `/therapy-goals/${id}`,

  // Video Sessions (BACKEND NOT IMPLEMENTED)
  CREATE_VIDEO_SESSION: '/clinical/video-sessions',
  LIST_VIDEO_SESSIONS: '/clinical/video-sessions',
  GET_VIDEO_SESSION: (id: string) => `/clinical/video-sessions/${id}`,
  UPDATE_VIDEO_SESSION: (id: string) => `/clinical/video-sessions/${id}`,
  DELETE_VIDEO_SESSION: (id: string) => `/clinical/video-sessions/${id}`,
  TRIGGER_AI_ANALYSIS: (id: string) => `/predict/${id}`,

  // Reports (BACKEND NOT IMPLEMENTED)
  GET_INDIVIDUAL_REPORT: (patientId: string) => `/clinical/reports/individual/${patientId}`,
  GET_CONSOLIDATED_REPORT: '/clinical/reports/consolidated',
  GENERATE_REPORT: '/clinical/reports/generate-pdf',
};

// Dashboard Stats (BACKEND NOT IMPLEMENTED)
export const DASHBOARD_ENDPOINTS = {
  THERAPIST_STATS: '/therapist/dashboard/stats',
  CAREGIVER_STATS: '/caregiver/dashboard/stats',
  ADMIN_STATS: '/admin/dashboard/stats',
};

// Helper function to build full URLs
export const buildUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper for dynamic endpoints with path parameters
export const buildDynamicUrl = (template: string, params: Record<string, string>): string => {
  let url = template;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, value);
  });
  return buildUrl(url);
};

// Helper to get full file URL
export const getFileUrl = (path?: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_HOST}${path}`;
};
