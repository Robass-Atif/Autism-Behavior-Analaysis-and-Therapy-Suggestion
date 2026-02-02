import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { HEALTH_ENDPOINTS, buildUrl } from '../config/apiConfig';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  database: {
    status: 'connected' | 'disconnected';
    latency: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Health Check
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async (): Promise<HealthCheckResponse> => {
      return apiClient.get<HealthCheckResponse>(HEALTH_ENDPOINTS.CHECK);
    },
    retry: 1,
    refetchInterval: 30 * 1000,
  });
};

// Quick health check (no auth required)
export const useQuickHealthCheck = () => {
  return useQuery({
    queryKey: ['health-quick'],
    queryFn: async (): Promise<{ status: string }> => {
      const response = await fetch(buildUrl(HEALTH_ENDPOINTS.CHECK));
      return { status: response.ok ? 'healthy' : 'unhealthy' };
    },
    retry: false,
    refetchInterval: 10 * 1000,
  });
};
