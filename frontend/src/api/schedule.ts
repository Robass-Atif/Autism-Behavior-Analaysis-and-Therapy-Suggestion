import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { CAREGIVER_SCHEDULE_ENDPOINTS } from '../config/apiConfig';

export interface ScheduleEntry {
  _id: string;
  therapistId: string;
  caregiverId: string;
  caregiverName?: string;
  patientId: string;
  patientName: string;
  actionType: string;
  scheduledDate: string;  // ISO string
  timeSlot?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
  updatedAt: string;
}

/** Fetch schedule entries. Month format: "YYYY-MM" */
export const useCaregiverSchedule = (month?: string, caregiverId?: string) => {
  return useQuery({
    queryKey: ['caregiver-schedule', month, caregiverId],
    queryFn: async (): Promise<ScheduleEntry[]> => {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (caregiverId) params.set('caregiverId', caregiverId);
      const qs = params.toString();
      return apiClient.get<ScheduleEntry[]>(
        `${CAREGIVER_SCHEDULE_ENDPOINTS.LIST}${qs ? `?${qs}` : ''}`
      );
    },
    staleTime: 2 * 60 * 1000,
  });
};

/** Therapist creates a schedule entry */
export const useCreateScheduleEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      caregiverId: string;
      caregiverName?: string;
      patientId: string;
      patientName: string;
      actionType: string;
      scheduledDate: string;
      timeSlot?: string;
      notes?: string;
    }) => apiClient.post<ScheduleEntry>(CAREGIVER_SCHEDULE_ENDPOINTS.CREATE, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiver-schedule'] });
    },
  });
};

/** Caregiver or Therapist updates an entry's status/details */
export const useUpdateScheduleEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduleEntry> }) =>
      apiClient.put<ScheduleEntry>(CAREGIVER_SCHEDULE_ENDPOINTS.UPDATE(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiver-schedule'] });
    },
  });
};

/** Therapist deletes a schedule entry */
export const useDeleteScheduleEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(CAREGIVER_SCHEDULE_ENDPOINTS.DELETE(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiver-schedule'] });
    },
  });
};
