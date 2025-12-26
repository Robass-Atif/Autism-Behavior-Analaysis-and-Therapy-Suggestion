
import { useQuery } from '@tanstack/react-query';
import { client, MOCK_AUDIT_LOGS } from '../lib/api-client';

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => client(MOCK_AUDIT_LOGS, 0, 700)
  });
};
