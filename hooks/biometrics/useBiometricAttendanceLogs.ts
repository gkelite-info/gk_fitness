import { useQuery } from '@tanstack/react-query';
import { getBiometricAttendanceLogs } from '@/helpers/biometrics/biometricAttendanceLogAPI';

export function useBiometricAttendanceLogs(
  gymId?: string,
  page = 1,
  limit = 10,
  filters?: {
    deviceId?: string;
    logType?: string;
    fromDate?: string;
    toDate?: string;
    searchQuery?: string;
  }
) {
  return useQuery({
    queryKey: ['biometricAttendanceLogs', gymId, page, limit, filters],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const res = await getBiometricAttendanceLogs(gymId, page, limit, filters);
      if (!res.success) throw new Error(res.error || 'Failed to fetch logs');
      return { data: res.data || [], total: res.total || 0 };
    },
    enabled: !!gymId,
  });
}
