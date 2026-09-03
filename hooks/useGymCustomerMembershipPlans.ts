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
          gym_customers(fullName, email, phone, users(profilePhoto)),
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

export function useGymCustomerMembershipPlansPaginated(userId: string | null, page = 1, limit = 10, searchQuery?: string, sortOrder: 'newest' | 'oldest' = 'newest', planId?: string) {
  return useQuery({
    queryKey: ['gymCustomerMembershipPlansPaginated', userId, page, limit, searchQuery, sortOrder, planId],
    queryFn: async () => {
      if (!userId) return { data: [], total: 0 };
      const gymId = await getOwnerGymId(userId);
      if (!gymId) return { data: [], total: 0 };

      const { fetchGymCustomerMembershipPlansPaginated } = await import('@/helpers/gymCustomerMembershipPlans/gymCustomerMembershipPlans');
      return await fetchGymCustomerMembershipPlansPaginated(gymId, page, limit, searchQuery, sortOrder, planId);
    },
    enabled: !!userId,
  });
}
