import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface WatchDeviceRow {
  deviceId: string;
  userId: string;
  platform: string;
  deviceName?: string | null;
  nodeId?: string | null;
  lastSeenAt?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
}

export function useWatchDevices(userId?: string | null) {
  return useQuery({
    queryKey: ['watch_devices', userId],
    queryFn: async (): Promise<WatchDeviceRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('watch_devices')
        .select('*')
        .eq('userId', userId)
        .order('lastSeenAt', { ascending: false });

      if (error) {
        console.warn('[useWatchDevices] query error:', error);
        return [];
      }
      return (data as WatchDeviceRow[]) || [];
    },
    enabled: !!userId,
  });
}

export function useWatchStats(userId?: string | null) {
  return useQuery({
    queryKey: ['watch_stats', userId],
    queryFn: async () => {
      if (!userId) return { totalWearSets: 0, totalWearWorkouts: 0, lastHeartRate: null };

      const [setsRes, workoutsRes, hrRes] = await Promise.all([
        supabase
          .from('customer_workout_set_logs')
          .select('customerWorkoutSetLogId', { count: 'exact', head: true })
          .eq('userId', userId)
          .eq('source', 'wearos'),
        supabase
          .from('customer_workout_logs')
          .select('customerWorkoutLogId', { count: 'exact', head: true })
          .eq('userId', userId)
          .eq('source', 'wearos'),
        supabase
          .from('workout_heart_rate_logs')
          .select('heartRate, recordedAt')
          .eq('userId', userId)
          .order('recordedAt', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        totalWearSets: setsRes.count || 0,
        totalWearWorkouts: workoutsRes.count || 0,
        lastHeartRate: hrRes.data?.heartRate || null,
        lastHeartRateAt: hrRes.data?.recordedAt || null,
      };
    },
    enabled: !!userId,
  });
}

