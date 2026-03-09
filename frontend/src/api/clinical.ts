import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/apiClient";
import { CLINICAL_ENDPOINTS } from "../config/apiConfig";
import { TherapyGoal, VideoSession, PatientLongitudinalData } from "../types";

// ============ THERAPY GOALS ============

export const useTherapyGoals = (
  params: { patientId?: string; status?: string } = {},
) => {
  const { patientId, status } = params;

  // Build query string
  const queryParts: string[] = [];
  if (patientId) queryParts.push(`patientId=${patientId}`);
  if (status) queryParts.push(`status=${status}`);
  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

  return useQuery({
    queryKey: ["therapy-goals", patientId, status],
    queryFn: async (): Promise<{ goals: TherapyGoal[]; total: number }> => {
      const endpoint = CLINICAL_ENDPOINTS.LIST_THERAPY_GOALS + queryString;
      return apiClient.get<{ goals: TherapyGoal[]; total: number }>(endpoint);
    },
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });
};

export const useMyTherapyGoals = () => {
  return useQuery({
    queryKey: ["my-therapy-goals"],
    queryFn: async (): Promise<{ goals: TherapyGoal[]; total: number }> => {
      const endpoint = "/clinical/therapy-goals/me";
      return apiClient.get<{ goals: TherapyGoal[]; total: number }>(endpoint);
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTherapyGoal = (goalId: string) => {
  return useQuery({
    queryKey: ["therapy-goal", goalId],
    queryFn: async (): Promise<TherapyGoal> => {
      return apiClient.get<TherapyGoal>(
        CLINICAL_ENDPOINTS.GET_THERAPY_GOAL(goalId),
      );
    },
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateTherapyGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: Partial<TherapyGoal>,
    ): Promise<{ success: boolean; goal: TherapyGoal }> => {
      return apiClient.post<{ success: boolean; goal: TherapyGoal }>(
        CLINICAL_ENDPOINTS.CREATE_THERAPY_GOAL,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapy-goals"] });
    },
  });
};

export const useUpdateTherapyGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<TherapyGoal>;
    }): Promise<{ success: boolean; goal: TherapyGoal }> => {
      return apiClient.put<{ success: boolean; goal: TherapyGoal }>(
        CLINICAL_ENDPOINTS.UPDATE_THERAPY_GOAL(id),
        data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["therapy-goals"] });
      queryClient.invalidateQueries({
        queryKey: ["therapy-goal", variables.id],
      });
    },
  });
};

export const useDeleteTherapyGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(
        CLINICAL_ENDPOINTS.DELETE_THERAPY_GOAL(id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["therapy-goals"] });
    },
  });
};

// ============ VIDEO SESSIONS ============

export const useVideoSessions = (patientId?: string) => {
  return useQuery({
    queryKey: ["video-sessions", patientId],
    queryFn: async (): Promise<{ sessions: VideoSession[]; total: number }> => {
      const endpoint =
        CLINICAL_ENDPOINTS.LIST_VIDEO_SESSIONS +
        (patientId ? `?patientId=${patientId}` : "");
      return apiClient.get<{ sessions: VideoSession[]; total: number }>(
        endpoint,
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useMyVideoSessions = () => {
  return useQuery({
    queryKey: ["my-video-sessions"],
    queryFn: async (): Promise<{ sessions: VideoSession[]; total: number }> => {
      const endpoint = "/clinical/video-sessions/me";
      return apiClient.get<{ sessions: VideoSession[]; total: number }>(
        endpoint,
      );
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRecentSessions = () => {
  return useQuery({
    queryKey: ["recent-sessions"],
    queryFn: async (): Promise<{ sessions: VideoSession[]; total: number }> => {
      return apiClient.get<{ sessions: VideoSession[]; total: number }>(
        CLINICAL_ENDPOINTS.LIST_VIDEO_SESSIONS,
      );
    },
    staleTime: 60 * 1000,
  });
};

export const usePendingReviewSessions = () => {
  return useQuery({
    queryKey: ["pending-review-sessions"],
    queryFn: async (): Promise<{ sessions: VideoSession[]; total: number }> => {
      return apiClient.get<{ sessions: VideoSession[]; total: number }>(
        CLINICAL_ENDPOINTS.LIST_VIDEO_SESSIONS,
      );
    },
    staleTime: 60 * 1000,
    select: (data) => ({
      sessions: data.sessions.filter(
        (s) =>
          s.status === "pending_review" ||
          s.status === "approved_for_ai" ||
          s.status === "processing" ||
          s.status === "failed" ||
          s.status === "completed",
      ),
      total: data.sessions.filter(
        (s) =>
          s.status === "pending_review" ||
          s.status === "approved_for_ai" ||
          s.status === "processing" ||
          s.status === "failed" ||
          s.status === "completed",
      ).length,
    }),
  });
};

export const useVideoSession = (sessionId: string) => {
  return useQuery({
    queryKey: ["video-session", sessionId],
    queryFn: async (): Promise<VideoSession> => {
      return apiClient.get<VideoSession>(
        CLINICAL_ENDPOINTS.GET_VIDEO_SESSION(sessionId),
      );
    },
    enabled: !!sessionId,
    staleTime: 60 * 1000,
  });
};

export const useUploadVideoSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: FormData,
    ): Promise<{ success: boolean; session: VideoSession }> => {
      return apiClient.postFormData<{
        success: boolean;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.CREATE_VIDEO_SESSION, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useUpdateVideoSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<VideoSession>;
    }): Promise<{ success: boolean; session: VideoSession }> => {
      return apiClient.put<{ success: boolean; session: VideoSession }>(
        CLINICAL_ENDPOINTS.UPDATE_VIDEO_SESSION(id),
        data,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({
        queryKey: ["video-session", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useDeleteVideoSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(
        CLINICAL_ENDPOINTS.DELETE_VIDEO_SESSION(id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

// ============ VIDEO SESSION WORKFLOW ============

export const useApproveForAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{
      success: boolean;
      message: string;
      session: VideoSession;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.APPROVE_VIDEO_SESSION(id), {});
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["video-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useTriggerAIAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{
      success: boolean;
      message: string;
      sessionId: string;
      status: string;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        sessionId: string;
        status: string;
      }>(CLINICAL_ENDPOINTS.TRIGGER_AI_ANALYSIS(id), {});
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["video-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useCancelAIAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{
      success: boolean;
      message: string;
      session: VideoSession;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.CANCEL_AI_ANALYSIS(id), {});
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["video-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useRetryAIAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{
      success: boolean;
      message: string;
      session: VideoSession;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.RETRY_AI_ANALYSIS(id), {});
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["video-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-review-sessions"] });
    },
  });
};

export const useSubmitTherapistReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        overrideSeverity?: number;
        reviewNotes?: string;
        therapyPlanAdjustments?: string;
      };
    }): Promise<{
      success: boolean;
      message: string;
      session: VideoSession;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.REVIEW_VIDEO_SESSION(id), data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["video-session", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
    },
  });
};

export const usePublishReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      id: string,
    ): Promise<{
      success: boolean;
      message: string;
      session: VideoSession;
    }> => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: VideoSession;
      }>(CLINICAL_ENDPOINTS.PUBLISH_VIDEO_SESSION(id), {});
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["video-session", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["video-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-sessions"] });
    },
  });
};

// ============ LONGITUDINAL DATA ============

export const usePatientLongitudinal = (patientId: string) => {
  return useQuery({
    queryKey: ["patient-longitudinal", patientId],
    queryFn: async (): Promise<PatientLongitudinalData> => {
      return apiClient.get<PatientLongitudinalData>(
        CLINICAL_ENDPOINTS.PATIENT_LONGITUDINAL(patientId),
      );
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });
};

// ============ REPORTS ============

export const useIndividualReport = (patientId: string) => {
  return useQuery({
    queryKey: ["individual-report", patientId],
    queryFn: async (): Promise<any> => {
      return apiClient.get<any>(
        CLINICAL_ENDPOINTS.GET_INDIVIDUAL_REPORT(patientId),
      );
    },
    enabled: !!patientId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useConsolidatedReport = () => {
  return useQuery({
    queryKey: ["consolidated-report"],
    queryFn: async (): Promise<any> => {
      return apiClient.get<any>(CLINICAL_ENDPOINTS.GET_CONSOLIDATED_REPORT);
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      patientId: string;
      sessionId?: string;
      includeGoals?: boolean;
      includeCharts?: boolean;
      includeTables?: boolean;
      includeNotes?: boolean;
      watermark?: boolean;
      password?: string;
      reportType?: string;
    }): Promise<Blob> => {
      return apiClient.postBlob(CLINICAL_ENDPOINTS.GENERATE_REPORT, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["individual-report"] });
      queryClient.invalidateQueries({ queryKey: ["consolidated-report"] });
    },
  });
};
