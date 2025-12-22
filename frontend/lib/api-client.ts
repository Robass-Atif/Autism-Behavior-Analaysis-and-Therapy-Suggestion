
import { Patient, DashboardStats, VideoSession, UserRole, TherapyGoal, AuditLogEntry } from '../types';

// --- MOCK DATA STORE ---
export const MOCK_PATIENTS: Patient[] = [
  {
    id: '1',
    mrn: 'MRN-2024-001',
    fullName: 'Liam Johnson',
    dob: '2018-05-12',
    gender: 'Male',
    diagnosisDate: '2021-02-10',
    asdSeverity: 'Level 2',
    caregiverId: 'cg-1',
    caregiverName: 'Sarah Johnson',
    status: 'Active',
    lastActivity: '2 hours ago',
    progressScore: 78,
    coOccurringConditions: ['ADHD']
  },
  {
    id: '2',
    mrn: 'MRN-2024-002',
    fullName: 'Emma Davis',
    dob: '2019-08-22',
    gender: 'Female',
    diagnosisDate: '2022-01-15',
    asdSeverity: 'Level 1',
    caregiverId: 'cg-2',
    caregiverName: 'Mike Davis',
    status: 'Active',
    lastActivity: '1 day ago',
    progressScore: 85,
    coOccurringConditions: ['Anxiety']
  },
   {
    id: '3',
    mrn: 'MRN-2024-003',
    fullName: 'Noah Wilson',
    dob: '2017-11-30',
    gender: 'Male',
    diagnosisDate: '2020-05-20',
    asdSeverity: 'Level 3',
    caregiverId: 'cg-3',
    caregiverName: 'Jenny Wilson',
    status: 'Pending',
    lastActivity: '5 days ago',
    progressScore: 62,
    coOccurringConditions: ['Sensory Processing Disorder']
  }
];

export const MOCK_GOALS: TherapyGoal[] = [
  {
    id: 'g1',
    patientId: '1',
    title: 'Improve Eye Contact',
    category: 'Social Skills',
    description: 'Maintain eye contact for 5 seconds during conversation.',
    status: 'Active',
    progress: 65,
    startDate: '2023-09-01',
    targetDate: '2023-12-31',
    priority: 'High'
  },
  {
    id: 'g2',
    patientId: '1',
    title: 'Fine Motor Pincer Grasp',
    category: 'Motor Skills',
    description: 'Pick up small objects using thumb and forefinger.',
    status: 'Achieved',
    progress: 100,
    startDate: '2023-08-01',
    targetDate: '2023-10-01',
    priority: 'Medium'
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { id: '1', timestamp: '2023-10-24 10:30:00', user: 'Dr. Sarah', role: UserRole.THERAPIST, action: 'View Patient', resource: 'Patient #1', status: 'Success', details: 'Access authorized' },
  { id: '2', timestamp: '2023-10-24 10:35:00', user: 'Dr. Sarah', role: UserRole.THERAPIST, action: 'Update Goal', resource: 'Goal #g1', status: 'Success', details: 'Progress updated to 65%' },
  { id: '3', timestamp: '2023-10-24 11:00:00', user: 'Admin', role: UserRole.ADMIN, action: 'System Backup', resource: 'Database', status: 'Success', details: 'Manual backup triggered' },
  { id: '4', timestamp: '2023-10-24 12:15:00', user: 'Unknown', role: UserRole.CAREGIVER, action: 'Login', resource: 'Auth', status: 'Failure', details: 'Invalid password' },
];

export const MOCK_SESSIONS: VideoSession[] = [
  {
    id: 'v1',
    patientId: '1',
    patientName: 'Liam Johnson',
    recordedAt: '2023-10-12T10:30:00',
    duration: 45,
    actionType: 'Arm Swing',
    qualityScore: 'High',
    status: 'Reviewed',
    aiConfidence: 0.92,
    caregiverName: 'Sarah Johnson'
  },
  {
    id: 'v2',
    patientId: '2',
    patientName: 'Emma Davis',
    recordedAt: '2023-10-11T14:15:00',
    duration: 32,
    actionType: 'Social Greeting',
    qualityScore: 'Medium',
    status: 'Analyzed',
    aiConfidence: 0.85,
    caregiverName: 'Mike Davis'
  }
];

// --- INTERCEPTOR / CLIENT LOGIC ---

/**
 * Simulates a network request interceptor.
 * In a real app, this would be an Axios instance with interceptors for auth headers and global error handling.
 */
export const client = async <T>(responseBody: T, errorRate = 0, delayMs = 800): Promise<T> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // Simulate random network errors or specific logic errors
  if (Math.random() < errorRate) {
    throw new Error('Network Error: Service unavailable');
  }

  // Log request (Mocking logging interceptor)
  console.log('API Request Intercepted:', { timestamp: new Date(), response: responseBody });

  return responseBody;
};
