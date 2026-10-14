import { useQuery } from '@tanstack/react-query';
import { fetchCustomerAttendance } from '@/helpers/attendance/attendanceHelper';

export function useCustomerAttendance(customerId?: string | null) {
  return useQuery({
    queryKey: ['customerAttendance', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      return await fetchCustomerAttendance(customerId);
    },
    enabled: !!customerId,
  });
}
