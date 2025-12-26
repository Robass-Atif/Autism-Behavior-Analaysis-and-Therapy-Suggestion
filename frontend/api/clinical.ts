
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, MOCK_GOALS, MOCK_SESSIONS } from '../lib/api-client';
import { DashboardStats, TherapyGoal, VideoSession } from '../types';

// --- DASHBOARD STATS ---
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => client<DashboardStats>({
      totalPatients: 48,
      activePatients: 42,
      pendingReviews: 7,
      reportsGenerated: 156,
      avgProgress: 85
    }, 0, 500)
  });
};

// --- THERAPY GOALS ---
export const useTherapyGoals = (patientId?: string) => {
  return useQuery({
    queryKey: ['goals', patientId],
    queryFn: () => client(MOCK_GOALS)
  });
};

export const useCreateTherapyGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TherapyGoal>) => {
      const newGoal = { ...data, id: `g${Math.random()}` };
      return client(newGoal, 0, 800);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
};

// --- VIDEO SESSIONS ---
export const useRecentSessions = () => {
  return useQuery({
    queryKey: ['recent-sessions'],
    queryFn: () => client<VideoSession[]>(MOCK_SESSIONS, 0, 600)
  });
};

export const useUploadVideoSession = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      return client({ success: true, id: `v${Math.random()}` }, 0, 2000);
    }
  });
};
