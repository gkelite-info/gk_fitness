import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

export function useGymMembershipPlans(userId: string | null) {
  return useQuery({
    queryKey: ['gymMembershipPlans', userId],
    queryFn: async () => {
      if (!userId) return [];

      const gymId = await getOwnerGymId(userId);
      
      if (!gymId) return [];

      const { data, error } = await supabase
        .from('gym_membership_plans')
        .select('*')
        .eq('gymId', gymId)
        .eq('is_deleted', false)
        .eq('is_Active', true)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[useGymMembershipPlans] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
  });
}
