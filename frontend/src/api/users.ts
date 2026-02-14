import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { USERS_ENDPOINTS } from '../config/apiConfig';
import { UserRole, UserStatus } from '../types';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  licenseNumber?: string;
  organizationName?: string;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Get All Users (Admin)
export const useUsers = (page = 1, limit = 20, status?: string, role?: string) => {
  let endpoint = `${USERS_ENDPOINTS.LIST}?page=${page}&limit=${limit}`;
  if (status) endpoint += `&status=${status}`;
  if (role) endpoint += `&role=${role}`;

  return useQuery({
    queryKey: ['users', page, limit, status, role],
    queryFn: async (): Promise<PaginatedUsers> => {
      return apiClient.get<PaginatedUsers>(endpoint);
    },
  });
};

// Get Pending Approvals
export const usePendingApprovals = () => {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async (): Promise<User[]> => {
      return apiClient.get<User[]>(USERS_ENDPOINTS.GET_PENDING_APPROVALS);
    },
  });
};

// Get Current User
export const useUserMe = () => {
  return useQuery({
    queryKey: ['user-me'],
    queryFn: async (): Promise<User> => {
      return apiClient.get<User>(USERS_ENDPOINTS.GET_ME);
    },
    retry: false,
  });
};

// Get User by ID
export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async (): Promise<User> => {
      return apiClient.getById<User>(USERS_ENDPOINTS.GET_USER(':id'), id);
    },
    enabled: !!id,
  });
};

// Approve User
export const useApproveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<User> => {
      return apiClient.put<User>(USERS_ENDPOINTS.APPROVE_USER(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
};

// Reject User
export const useRejectUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<User> => {
      return apiClient.put<User>(USERS_ENDPOINTS.REJECT_USER(id), {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
};

// Update User Status
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }): Promise<User> => {
      return apiClient.put<User>(USERS_ENDPOINTS.UPDATE_USER_STATUS(id), { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
    },
  });
};

// Delete User
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return apiClient.delete<void>(USERS_ENDPOINTS.DELETE_USER(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
