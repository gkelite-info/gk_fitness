import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

export function useGymCustomerMembershipPlans(userId: string | null, customerId?: string | null) {
  return useQuery({
    queryKey: ['gymCustomerMembershipPlans', userId, customerId],
    queryFn: async () => {
      if (!userId) return [];

      const gymId = await getOwnerGymId(userId);
      
      if (!gymId) return [];

      let query = supabase
        .from('gym_customer_membership_plans')
        .select(`
          *,
          gym_customers(fullName, email, phone),
          gym_membership_plans(planName, durationMonths, price)
        `)
        .eq('gymId', gymId)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false });

      if (customerId) {
        query = query.eq('customerId', customerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useGymCustomerMembershipPlans] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!userId,
  });
}
