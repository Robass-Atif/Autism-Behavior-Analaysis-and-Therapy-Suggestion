
import { useMutation } from '@tanstack/react-query';
import { client } from '../lib/api-client';
import { UserRole } from '../types';

export const useLogin = () => {
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      if (email.includes('error')) throw new Error('Invalid credentials');
      
      const user = { 
        id: 'user-1', 
        name: role === UserRole.THERAPIST ? 'Dr. Sarah Williams' : role === UserRole.ADMIN ? 'System Admin' : 'Jane Doe', 
        email, 
        role 
      };
      
      return client(user);
    }
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      return client({ success: true }, 0, 1000);
    }
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: async (password: string) => {
      return client({ success: true }, 0, 1000);
    }
  });
};
