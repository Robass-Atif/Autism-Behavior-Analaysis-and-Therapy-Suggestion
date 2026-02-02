import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { UPLOAD_ENDPOINTS } from '../config/apiConfig';

export interface UploadResponse {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

// Upload License
export const useUploadLicense = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('license', file);
      return apiClient.postFormData<UploadResponse>(UPLOAD_ENDPOINTS.UPLOAD_LICENSE, formData);
    },
  });
};

// Upload Signature
export const useUploadSignature = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('signature', file);
      return apiClient.postFormData<UploadResponse>(UPLOAD_ENDPOINTS.UPLOAD_SIGNATURE, formData);
    },
  });
};

// Get File URL
export const getFileUrl = (type: string, filename: string): string => {
  return UPLOAD_ENDPOINTS.GET_FILE(type, filename);
};
