import { Patient, DashboardStats, VideoSession, UserRole, TherapyGoal, AuditLogEntry } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data
const MOCK_PATIENTS: Patient[] = [
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

const MOCK_GOALS: TherapyGoal[] = [
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

const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  { id: '1', timestamp: '2023-10-24 10:30:00', user: 'Dr. Sarah', role: UserRole.THERAPIST, action: 'View Patient', resource: 'Patient #1', status: 'Success', details: 'Access authorized' },
  { id: '2', timestamp: '2023-10-24 10:35:00', user: 'Dr. Sarah', role: UserRole.THERAPIST, action: 'Update Goal', resource: 'Goal #g1', status: 'Success', details: 'Progress updated to 65%' },
  { id: '3', timestamp: '2023-10-24 11:00:00', user: 'Admin', role: UserRole.ADMIN, action: 'System Backup', resource: 'Database', status: 'Success', details: 'Manual backup triggered' },
  { id: '4', timestamp: '2023-10-24 12:15:00', user: 'Unknown', role: UserRole.CAREGIVER, action: 'Login', resource: 'Auth', status: 'Failure', details: 'Invalid password' },
];

export const api = {
  login: async (email: string, role: UserRole) => {
    await delay(800);
    if (email.includes('error')) throw new Error('Invalid credentials');
    return { 
      id: 'user-1', 
      name: role === UserRole.THERAPIST ? 'Dr. Sarah Williams' : role === UserRole.ADMIN ? 'System Admin' : 'Jane Doe', 
      email, 
      role 
    };
  },
  resetPassword: async (email: string) => {
    await delay(1000);
    return { success: true };
  },
  updatePassword: async (password: string) => {
    await delay(1000);
    return { success: true };
  },
  getStats: async (): Promise<DashboardStats> => {
    await delay(500);
    return {
      totalPatients: 48,
      activePatients: 42,
      pendingReviews: 7,
      reportsGenerated: 156,
      avgProgress: 85
    };
  },
  getPatients: async () => { await delay(800); return MOCK_PATIENTS; },
  getPatient: async (id: string) => { await delay(400); return MOCK_PATIENTS.find(p => p.id === id); },
  createPatient: async (data: any) => { await delay(1000); return { ...data, id: 'new' }; },
  getTherapyGoals: async (patientId?: string) => { await delay(600); return MOCK_GOALS; },
  createTherapyGoal: async (data: any) => { await delay(800); return { ...data, id: `g${Math.random()}` }; },
  getAuditLogs: async () => { await delay(700); return MOCK_AUDIT_LOGS; },
  getRecentSessions: async (): Promise<VideoSession[]> => {
    await delay(600);
    return [
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
  },
  uploadVideoSession: async (data: any) => {
    await delay(2000);
    return { success: true, id: `v${Math.random()}` };
  }
};
