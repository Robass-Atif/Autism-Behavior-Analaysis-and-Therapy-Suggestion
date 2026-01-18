import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { PATIENTS_ENDPOINTS } from '../config/apiConfig';
import { Patient, Address, EmergencyContact, CommunicationPreferences } from '../types';

export interface CreatePatientData {
  // Required fields
  mrn: string;
  fullName: string;
  dob: string;
  gender: string;

  // Contact Information
  email?: string;
  phone?: string;
  address?: Address;
  preferredLanguage?: string;
  communicationPreferences?: CommunicationPreferences;

  // Emergency Contact
  emergencyContact?: EmergencyContact;

  // Medical Information
  diagnosisDate?: string;
  asdSeverity?: string;
  diagnosisDetails?: string;
  primaryPhysician?: string;
  coOccurringConditions?: string[];
  allergies?: string[];
  currentMedications?: string[];
  specialNeeds?: string;
  previousTherapies?: string[];

  // Insurance
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;

  // Clinical
  referralSource?: string;
  admissionDate?: string;
  clinicalNotes?: string;
  caregiverNotes?: string;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
  status?: 'Active' | 'Inactive' | 'Discharged';
  dischargeReason?: string;
  dischargeDate?: string;
}

// Get Therapist's Patients with backend filtering
export const usePatients = (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
  const { search, status, page = 1, limit = 50 } = params;

  // Build query string for backend filtering
  const queryParams = new URLSearchParams();
  if (search?.trim()) queryParams.append('search', search.trim());
  if (status && status !== 'all') queryParams.append('status', status);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const endpoint = queryParams.toString()
    ? `${PATIENTS_ENDPOINTS.GET_THERAPIST_PATIENTS}?${queryParams.toString()}`
    : PATIENTS_ENDPOINTS.GET_THERAPIST_PATIENTS;

  return useQuery({
    queryKey: ['patients', search, status, page, limit],
    queryFn: async (): Promise<{ patients: Patient[]; total: number; page: number; totalPages: number }> => {
      return apiClient.get<{ patients: Patient[]; total: number; page: number; totalPages: number }>(endpoint);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Get Caregiver's Patients
export const useCaregiverPatients = () => {
  return useQuery({
    queryKey: ['caregiver-patients'],
    queryFn: async (): Promise<{ patients: Patient[] }> => {
      return apiClient.get<{ patients: Patient[] }>(PATIENTS_ENDPOINTS.GET_CAREGIVER_PATIENTS);
    },
    staleTime: 5 * 60 * 1000,
  });
};

// Get Single Patient (NOW SUPPORTED BY BACKEND)
export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async (): Promise<Patient> => {
      const endpoint = `/patients/${id}`;
      return apiClient.get<Patient>(endpoint);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

// Create Patient
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePatientData): Promise<{ success: boolean; message: string; patient: Patient }> => {
      return apiClient.post<{ success: boolean; message: string; patient: Patient }>(PATIENTS_ENDPOINTS.CREATE, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
    },
  });
};

// Update Patient (NOW SUPPORTED BY BACKEND)
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePatientData }): Promise<{ success: boolean; patient: Patient }> => {
      const endpoint = `/patients/${id}`;
      return apiClient.put<{ success: boolean; patient: Patient }>(endpoint, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
    },
  });
};

// Delete Patient (NOW SUPPORTED BY BACKEND)
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean; message: string }> => {
      const endpoint = `/patients/${id}`;
      return apiClient.delete<{ success: boolean; message: string }>(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
    },
  });
};

// Get Recent Patients
export const useRecentPatients = () => {
  return useQuery({
    queryKey: ['recent-patients'],
    queryFn: async (): Promise<Patient[]> => {
      const response = await apiClient.get<{ patients: Patient[]; total: number }>(PATIENTS_ENDPOINTS.GET_THERAPIST_PATIENTS + '?limit=5');
      return response.patients || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
