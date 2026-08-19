import { useQuery } from '@tanstack/react-query';
import { fetchGymAttendanceToday } from '@/helpers/attendance/attendanceHelper';

export function useGymAttendanceToday(gymId?: string, date?: string) {
  return useQuery({
    queryKey: ['attendanceToday', gymId, date],
    queryFn: async () => {
      if (!gymId) return [];
      const data = await fetchGymAttendanceToday(gymId, date);
      return data;
    },
    enabled: !!gymId,
  });
}
