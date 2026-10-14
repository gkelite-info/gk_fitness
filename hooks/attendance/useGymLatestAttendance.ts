import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface LatestAttendanceRecord {
  attendanceId: string;
  customerId: string;
  markedAt: string;
  date: string;
}

export function useGymLatestAttendance(gymId?: string) {
  return useQuery<LatestAttendanceRecord[]>({
    queryKey: ['gymLatestAttendance', gymId],
    queryFn: async () => {
      if (!gymId) return [];

      const { data, error } = await supabase
        .from('gym_attendance')
        .select('attendanceId, customerId, markedAt, date')
        .eq('gymId', gymId)
        .order('markedAt', { ascending: false });

      if (error) {
        console.error('[useGymLatestAttendance] Error fetching attendance:', error);
        return [];
      }
      return (data as LatestAttendanceRecord[]) || [];
    },
    enabled: !!gymId,
  });
}
