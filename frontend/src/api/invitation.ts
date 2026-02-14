import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { INVITATIONS_ENDPOINTS } from '../config/apiConfig';
import { CaregiverInvitation } from '../types';

export interface CreateInvitationInput {
  patientId: string;
  caregiverEmail: string;
  caregiverName: string;
  expiresInDays: number;
}

export interface ValidateInvitationInput {
  patientId: string;
  caregiverEmail: string;
}

// Get All Invitations
export const useInvitations = () => {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: async (): Promise<CaregiverInvitation[]> => {
      const response = await apiClient.get<any>(INVITATIONS_ENDPOINTS.LIST);
      console.log('📨 Invitations API Response:', response);
      // Handle different response formats
      if (Array.isArray(response)) {
        return response;
      }
      // If wrapped in an object, extract the array
      return response.invitations || response.data || [];
    },
    staleTime: 1 * 60 * 1000,
  });
};

// Validate Invitation
export const useValidateInvitation = () => {
  return useMutation({
    mutationFn: async (data: ValidateInvitationInput): Promise<{ valid: boolean; message?: string }> => {
      return apiClient.post<{ valid: boolean; message?: string }>(INVITATIONS_ENDPOINTS.VALIDATE, data);
    },
  });
};

// Create Invitation
export const useCreateInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvitationInput): Promise<any> => {
      const response = await apiClient.post<any>(INVITATIONS_ENDPOINTS.CREATE, data);
      // Backend returns { success: true, invitation: {...} }
      return response.invitation || response;
    },
    onSuccess: () => {
      // Invaldate the invitations query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};

// Resend Invitation
export const useResendInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.post<void>(INVITATIONS_ENDPOINTS.RESEND(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};

// Revoke Invitation
export const useRevokeInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.post<void>(INVITATIONS_ENDPOINTS.REVOKE(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};

// Validate Invitation Code
export const useValidateInvitationCode = (code: string) => {
  return useQuery({
    queryKey: ['invitation-code', code],
    queryFn: async (): Promise<CaregiverInvitation> => {
      return apiClient.get<CaregiverInvitation>(INVITATIONS_ENDPOINTS.VALIDATE_CODE(code));
    },
    enabled: !!code,
  });
};

// Delete Invitation
export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.delete<void>(INVITATIONS_ENDPOINTS.DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};
