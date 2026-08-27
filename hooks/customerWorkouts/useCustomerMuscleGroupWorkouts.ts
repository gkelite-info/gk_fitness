import { useQuery } from '@tanstack/react-query';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises, WorkoutPlanDayExerciseAttributes } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

export function useCustomerMuscleGroupWorkouts(userId: string | null | undefined, muscleGroup: string) {
  return useQuery({
    queryKey: ['customerMuscleGroupWorkouts', userId, muscleGroup],
    queryFn: async () => {
      if (!userId) return [];

      const plans = await fetchCustomerWorkoutPlans(userId);
      let activePlan = plans?.find((p: any) => p.isActive);
      if (!activePlan && plans && plans.length > 0) {
        activePlan = plans.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      }

      if (!activePlan) {
        return [];
      }

      const days = await fetchWorkoutPlanDays(activePlan.planId);

      let allExercises: WorkoutPlanDayExerciseAttributes[] = [];

      for (const day of days) {
        const exercises = await fetchWorkoutPlanDayExercises(day.planDayId);
        const exercisesWithContext = exercises.map(ex => ({
          ...ex,
          dayWorkoutType: day.workoutType,
        }));
        allExercises = [...allExercises, ...exercisesWithContext];
      }

      if (muscleGroup && muscleGroup !== 'All') {
        const target = muscleGroup.toLowerCase();
        allExercises = allExercises.filter((ex: any) => {
          const cat = ex.category?.toLowerCase() || '';
          const dayType = ex.dayWorkoutType?.toLowerCase() || '';
          return cat === target ||
            cat.startsWith(target.slice(0, 4)) ||
            target.startsWith(cat.slice(0, 4)) ||
            dayType === target ||
            dayType.startsWith(target.slice(0, 4)) ||
            target.startsWith(dayType.slice(0, 4));
        });
      }

      return allExercises;
    },
    enabled: !!userId && !!muscleGroup,
  });
}
