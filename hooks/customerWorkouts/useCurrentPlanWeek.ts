import { useMemo } from 'react';
import { useCustomerWorkoutPlans } from './useCustomerWorkoutPlans';
import { useUser } from '@/context/UserContext';

export function useCurrentPlanWeek(providedUserId?: string) {
  const { userId: contextUserId } = useUser();
  const userId = providedUserId || contextUserId;
  const { data: plans, isLoading } = useCustomerWorkoutPlans(userId);

  const currentWeekNumber = useMemo(() => {
    if (!plans || plans.length === 0) return 1;

    const activePlan = plans.find(p => p.isActive);
    if (!activePlan || !activePlan.createdAt) return 1;

    const createdAt = new Date(activePlan.createdAt);
    const today = new Date();
    
    // Calculate difference in time
    const diffTime = Math.abs(today.getTime() - createdAt.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const weeksElapsed = Math.floor(diffDays / 7);
    const currentWeek = (weeksElapsed % 4) + 1;
    
    return currentWeek;
  }, [plans]);

  return { currentWeekNumber, isLoading };
}
