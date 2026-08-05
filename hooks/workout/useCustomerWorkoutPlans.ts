import { useQuery } from '@tanstack/react-query';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';

export function useCustomerWorkoutPlans(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerWorkoutPlans', userId],
    queryFn: async () => {
      if (!userId) return [];
      return await fetchCustomerWorkoutPlans(userId);
    },
    enabled: !!userId,
  });
}
