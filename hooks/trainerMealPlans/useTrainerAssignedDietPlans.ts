import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export async function fetchAssignedDietPlansForTrainer(trainerUserId: string) {
  const { data: assignments } = await supabase
    .from('customer_trainers')
    .select('customerId')
    .eq('gymTrainerId', trainerUserId)
    .eq('isActive', true)
    .eq('is_deleted', false);

  if (!assignments || assignments.length === 0) return [];
  const customerIds = assignments.map(a => a.customerId);

  const { data: plans, error } = await supabase
    .from('trainer_meal_plans')
    .select('*')
    .in('userId', customerIds)
    .eq('isActive', true)
    .order('updatedAt', { ascending: false });

  if (error) throw error;
  if (!plans || plans.length === 0) return [];

  const { data: customers } = await supabase
    .from('gym_customers')
    .select('*, users(profilePhoto)')
    .in('customerId', customerIds);

  return plans.map(plan => {
    const customer = customers?.find(c => c.customerId === plan.userId);
    return { ...plan, customer };
  });
}

export function useTrainerAssignedDietPlans(trainerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['trainerAssignedDietPlans', trainerUserId],
    queryFn: async () => {
      if (!trainerUserId) return [];
      return await fetchAssignedDietPlansForTrainer(trainerUserId);
    },
    enabled: !!trainerUserId,
  });
}
