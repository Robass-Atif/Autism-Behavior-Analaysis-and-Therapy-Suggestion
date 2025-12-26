
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, MOCK_PATIENTS } from '../lib/api-client';
import { Patient } from '../types';

export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => client(MOCK_PATIENTS)
  });
};

export const usePatient = (id: string) => {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => client(MOCK_PATIENTS.find(p => p.id === id))
  });
};

export const useCreatePatient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      const newPatient = { ...data, id: `new-${Date.now()}` } as Patient;
      // In a real app, we would push to DB here
      return client(newPatient, 0, 1000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['recent-patients'] });
    }
  });
};

export const useRecentPatients = () => {
  return useQuery({
    queryKey: ['recent-patients'],
    queryFn: () => client(MOCK_PATIENTS.slice(0, 5))
  });
};
