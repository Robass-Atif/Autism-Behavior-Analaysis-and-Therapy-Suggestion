import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { PATIENTS_ENDPOINTS } from '../config/apiConfig';
import { Patient } from '../types';

export const useCaregiverPatients = () => {
  return useQuery({
    queryKey: ['caregiver-patients'],
    queryFn: async (): Promise<Patient[]> => {
      return apiClient.get<Patient[]>(PATIENTS_ENDPOINTS.GET_CAREGIVER_PATIENTS);
    },
    staleTime: 5 * 60 * 1000,
  });
};
