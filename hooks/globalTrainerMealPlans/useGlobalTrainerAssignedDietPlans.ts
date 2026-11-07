import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GlobalTrainerMealPlanAttributes } from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlans';

export interface AssignedGlobalTrainerDietPlan extends GlobalTrainerMealPlanAttributes {
  customer?: {
    userId: string;
    fullName?: string | null;
    email?: string | null;
    mobile?: string | null;
    profilePhoto?: string | null;
    gender?: string | null;
  } | null;
}

export async function fetchAssignedDietPlansForGlobalTrainer(
  globalTrainerId: string
): Promise<AssignedGlobalTrainerDietPlan[]> {
  if (!globalTrainerId) return [];

  const { data: plans, error } = await supabase
    .from('global_trainer_meal_plans')
    .select('*, customer:users!global_trainer_meal_plans_userId_fkey(userId, fullName, email, mobile, profilePhoto, gender)')
    .eq('createdBy', globalTrainerId)
    .order('updatedAt', { ascending: false });

  if (error) {
    console.error('[useGlobalTrainerAssignedDietPlans] Error fetching global trainer meal plans:', error);
    throw error;
  }

  if (plans && plans.length > 0) {
    return plans as AssignedGlobalTrainerDietPlan[];
  }

  // 2. Fallback: check clients assigned via individual_customer_trainers
  const { data: assignments, error: assignErr } = await supabase
    .from('individual_customer_trainers')
    .select('userId')
    .eq('globalTrainerId', globalTrainerId)
    .eq('isActive', true)
    .or('is_deleted.eq.false,is_deleted.is.null');

  if (assignErr) {
    console.warn('[useGlobalTrainerAssignedDietPlans] Warning fetching individual_customer_trainers:', assignErr);
  }

  if (assignments && assignments.length > 0) {
    const userIds = assignments.map(a => a.userId).filter(Boolean);
    if (userIds.length > 0) {
      const { data: clientPlans, error: clientPlansErr } = await supabase
        .from('global_trainer_meal_plans')
        .select('*, customer:users!global_trainer_meal_plans_userId_fkey(userId, fullName, email, mobile, profilePhoto, gender)')
        .in('userId', userIds)
        .order('updatedAt', { ascending: false });

      if (clientPlansErr) {
        console.error('[useGlobalTrainerAssignedDietPlans] Error fetching client plans:', clientPlansErr);
        throw clientPlansErr;
      }

      return (clientPlans || []) as AssignedGlobalTrainerDietPlan[];
    }
  }

  return [];
}

export function useGlobalTrainerAssignedDietPlans(
  globalTrainerId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['globalTrainerAssignedDietPlans', globalTrainerId],
    queryFn: async (): Promise<AssignedGlobalTrainerDietPlan[]> => {
      if (!globalTrainerId) return [];
      return await fetchAssignedDietPlansForGlobalTrainer(globalTrainerId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!globalTrainerId,
  });
}

