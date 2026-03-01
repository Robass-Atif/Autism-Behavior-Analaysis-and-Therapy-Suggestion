import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { DASHBOARD_ENDPOINTS } from "../config/apiConfig";

// Dashboard Statistics Types
export interface TherapistDashboardStats {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  pendingReviews: number;
  reportsGenerated: number;
  avgProgress: number;
  totalGoals: number;
  activeGoals: number;
  achievedGoals: number;
  totalSessions: number;
  pendingSessions: number;
  weeklySessions: { day: string; sessions: number; date: string }[];
  progressTrend: { week: string; progress: number; goals: number }[];
  goalAchievementRate: number;
}

export interface CaregiverDashboardStats {
  linkedPatients: number;
  uploadedVideos: number;
  pendingReviews: number;
  completedReports: number;
  scheduledSessions: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalTherapists: number;
  activeTherapists: number;
  pendingTherapists: number;
  totalCaregivers: number;
  activeCaregivers: number;
  totalPatients: number;
  totalApplications: number;
  pendingApplications: number;
  rejectedApplications: number;
  suspendedUsers: number;
  totalInvitations: number;
  pendingInvitations: number;
}

// Therapist Dashboard Stats
export const useTherapistDashboardStats = (
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: ["therapist-dashboard-stats"],
    queryFn: async (): Promise<TherapistDashboardStats> => {
      return apiClient.get<TherapistDashboardStats>(
        DASHBOARD_ENDPOINTS.THERAPIST_STATS,
      );
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

// Caregiver Dashboard Stats
export const useCaregiverDashboardStats = () => {
  return useQuery({
    queryKey: ["caregiver-dashboard-stats"],
    queryFn: async (): Promise<CaregiverDashboardStats> => {
      return apiClient.get<CaregiverDashboardStats>(
        DASHBOARD_ENDPOINTS.CAREGIVER_STATS,
      );
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Admin Dashboard Stats
export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<AdminDashboardStats> => {
      return apiClient.get<AdminDashboardStats>(
        DASHBOARD_ENDPOINTS.ADMIN_STATS,
      );
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Export for backward compatibility
export const useDashboardStats = useAdminDashboardStats;
