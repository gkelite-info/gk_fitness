import { useQuery } from '@tanstack/react-query';
import { fetchGymAttendanceToday } from '@/helpers/attendance/attendanceHelper';

export function useGymAttendanceToday(gymId?: string) {
  return useQuery({
    queryKey: ['attendanceToday', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const data = await fetchGymAttendanceToday(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}
