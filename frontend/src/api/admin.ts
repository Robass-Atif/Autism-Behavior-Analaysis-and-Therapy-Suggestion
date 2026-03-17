import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { ADMIN_ENDPOINTS } from "../config/apiConfig";
import { Patient } from "../types";

export interface TherapistApplication {
  id: string;
  therapistId: string;
  fullName: string;
  email: string;
  licenseNumber?: string;
  licenseType?: string;
  organizationName?: string;
  submittedAt: string;
  status:
    | "pending_approval"
    | "active"
    | "rejected"
    | "pending_verification"
    | "suspended";
  licenseCertificate?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userName: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface AdminDashboardStats {
  totalApplications: number;
  pendingApplications: number;
  activeTherapists: number;
  activeCaregivers: number;
  suspendedUsers: number;
  rejectedApplications: number;
  totalUsers: number;
  totalTherapists: number;
  totalCaregivers: number;
  totalPatients: number;
}

export interface SystemHealthStats {
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  cpu: {
    count: number;
    usagePercentage: number;
  };
  database: {
    status: string;
    latency: number;
  };
  history: {
    cpuUsage: number;
    memoryUsage: number;
    activeUsers: number;
    apiLatency: number;
    createdAt: string;
  }[];
  timestamp: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "therapist" | "caregiver" | "patient";
  status: string;
  createdAt: string;
  lastLogin?: string;
  professionalTitle?: string;
}

// Full user details with role-specific data
export interface UserDetails extends User {
  phoneNumber?: string;
  updatedAt?: string;
  roleSpecific?: {
    // Therapist specific
    licenseNumber?: string;
    licenseType?: string;
    organizationName?: string;
    department?: string;
    specialties?: string[];
    yearsOfExperience?: number;
    bio?: string;
    licenseVerified?: boolean;
    rejectionCount?: number;
    approvedAt?: string;
    licenseCertificate?: string;
    issuingAuthority?: string;
    licenseExpiryDate?: string;
    workAddress?: string;
    city?: string;
    stateProvince?: string;
    zipPostalCode?: string;
    country?: string;
    privacyPolicyAccepted?: boolean;
    termsAccepted?: boolean;
    hipaaAccepted?: boolean;
    // Caregiver specific
    linkedTherapistId?: string;
    linkedTherapistName?: string;
    relationshipToPatient?: string;
    patientIds?: string[];
    patientNames?: string[];
    // Admin specific
    adminLevel?: string;
    permissions?: string[];
    // Patient specific
    mrn?: string;
    asdSeverity?: string;
    diagnosisDetails?: string;
    progressScore?: number;
    latestClinicalReport?: any;
    diagnosisDate?: string;
    admissionDate?: string;
  };
}

// Get Therapist Applications
export const useTherapistApplications = (status?: string) => {
  let endpoint = ADMIN_ENDPOINTS.GET_THERAPIST_APPLICATIONS;
  if (status) endpoint += `?status=${status}`;

  return useQuery({
    queryKey: ["therapist-applications", status],
    queryFn: async (): Promise<{
      applications: TherapistApplication[];
      total: number;
    }> => {
      return apiClient.get<{
        applications: TherapistApplication[];
        total: number;
      }>(endpoint);
    },
  });
};

// Get All Users (Unified)
export const useAdminUsers = (
  params: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  } = {},
) => {
  const { role, status, page = 1, limit = 50, search } = params;
  let endpoint = ADMIN_ENDPOINTS.GET_ADMIN_USERS;
  const queryParams = new URLSearchParams();
  if (role) queryParams.append("role", role);
  if (status) queryParams.append("status", status);
  if (search) queryParams.append("search", search);
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  const queryString = queryParams.toString();
  if (queryString) endpoint += `?${queryString}`;

  return useQuery({
    queryKey: ["admin-users", params],
    queryFn: async (): Promise<{
      users: User[];
      total: number;
      page: number;
      totalPages: number;
    }> => {
      return apiClient.get<{
        users: User[];
        total: number;
        page: number;
        totalPages: number;
      }>(endpoint);
    },
  });
};

// Get Single User
export const useAdminUser = (userId: string) => {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async (): Promise<User> => {
      return apiClient.get<User>(ADMIN_ENDPOINTS.GET_ADMIN_USER(userId));
    },
    enabled: !!userId,
  });
};

// Approve Therapist Application
export const useApproveTherapistApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      notes,
    }: {
      id: string;
      notes?: string;
    }): Promise<TherapistApplication> => {
      return apiClient.post<TherapistApplication>(
        ADMIN_ENDPOINTS.APPROVE_THERAPIST_APPLICATION(id),
        { notes },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapist-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Reject Therapist Application
export const useRejectTherapistApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
      notes,
    }: {
      id: string;
      reason: string;
      notes?: string;
    }): Promise<TherapistApplication> => {
      return apiClient.post<TherapistApplication>(
        ADMIN_ENDPOINTS.REJECT_THERAPIST_APPLICATION(id),
        { reason, notes },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapist-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Suspend User
export const useSuspendUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason: string;
    }): Promise<void> => {
      return apiClient.post<void>(ADMIN_ENDPOINTS.SUSPEND_USER(id), { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Activate User
export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.post<void>(ADMIN_ENDPOINTS.ACTIVATE_USER(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Delete Therapist
export const useDeleteTherapist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.delete<void>(ADMIN_ENDPOINTS.DELETE_THERAPIST(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["therapist-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Get Admin Patients
export const useAdminPatients = (status?: string) => {
  let endpoint = ADMIN_ENDPOINTS.GET_ADMIN_PATIENTS;
  if (status) endpoint += `?status=${status}`;

  return useQuery({
    queryKey: ["admin-patients", status],
    queryFn: async (): Promise<Patient[]> => {
      return apiClient.get<Patient[]>(endpoint);
    },
  });
};

// Get Audit Logs
export const useAuditLogs = (page = 1, limit = 50) => {
  return useQuery({
    queryKey: ["audit-logs", page, limit],
    queryFn: async (): Promise<{ logs: AuditLog[]; total: number }> => {
      return apiClient.get<{ logs: AuditLog[]; total: number }>(
        `${ADMIN_ENDPOINTS.GET_AUDIT_LOGS}?page=${page}&limit=${limit}`,
      );
    },
  });
};

// Get Admin Dashboard Stats (NOW FROM DEDICATED BACKEND ENDPOINT)
export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async (): Promise<AdminDashboardStats> => {
      // Use the dedicated dashboard endpoint
      return apiClient.get<AdminDashboardStats>("/admin/dashboard/stats");
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Get User Growth Stats
export const useUserGrowthStats = () => {
  return useQuery({
    queryKey: ["admin-growth-stats"],
    queryFn: async (): Promise<{ name: string; users: number }[]> => {
      return apiClient.get<{ name: string; users: number }[]>(
        "/admin/dashboard/growth",
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Get Full User Details
export const useAdminUserDetails = (userId: string) => {
  return useQuery({
    queryKey: ["admin-user-details", userId],
    queryFn: async (): Promise<UserDetails> => {
      return apiClient.get<UserDetails>(
        ADMIN_ENDPOINTS.GET_ADMIN_USER_DETAILS(userId),
      );
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });
};

// Update User
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        fullName?: string;
        phoneNumber?: string;
        organizationName?: string;
        department?: string;
      };
    }): Promise<{ success: boolean; message: string; user: User }> => {
      return apiClient.put<{ success: boolean; message: string; user: User }>(
        ADMIN_ENDPOINTS.UPDATE_USER(id),
        data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-user", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["admin-user-details", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Delete User (Soft Delete)
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string;
      reason?: string;
    }): Promise<{ success: boolean; message: string }> => {
      const endpoint = reason
        ? `${ADMIN_ENDPOINTS.DELETE_USER(id)}?reason=${encodeURIComponent(reason)}`
        : ADMIN_ENDPOINTS.DELETE_USER(id);
      return apiClient.delete<{ success: boolean; message: string }>(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
};

// Get System Health Stats
export const useSystemHealth = () => {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemHealthStats> => {
      return apiClient.get<SystemHealthStats>(
        ADMIN_ENDPOINTS.GET_SYSTEM_HEALTH,
      );
    },
    refetchInterval: 30000,
    staleTime: 10 * 1000,
  });
};
