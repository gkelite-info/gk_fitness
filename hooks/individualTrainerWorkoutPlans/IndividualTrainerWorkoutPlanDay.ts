import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchIndividualTrainerWorkoutPlanDays,
  fetchIndividualTrainerWorkoutPlanDayById,
  fetchIndividualTrainerWorkoutPlanDayByDayOfWeek,
  saveIndividualTrainerWorkoutPlanDay,
  saveMultipleIndividualTrainerWorkoutPlanDays,
  deleteIndividualTrainerWorkoutPlanDay,
  makeIndividualTrainerRestDay,
  DayOfWeek,
  DAYS_ORDER,
  IndividualTrainerWorkoutPlanDayAttributes,
  SaveIndividualTrainerWorkoutPlanDayParams,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDay';

export type {
  DayOfWeek,
  IndividualTrainerWorkoutPlanDayAttributes,
  SaveIndividualTrainerWorkoutPlanDayParams,
};
export { DAYS_ORDER };

export function useIndividualTrainerWorkoutPlanDays(
  planId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlanDays', planId],
    queryFn: async () => {
      if (!planId) return [];
      return await fetchIndividualTrainerWorkoutPlanDays(planId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!planId,
  });
}

export function useIndividualTrainerWorkoutPlanDayById(
  planDayId?: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlanDay', planDayId],
    queryFn: async () => {
      if (!planDayId) return null;
      return await fetchIndividualTrainerWorkoutPlanDayById(planDayId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!planDayId,
  });
}

export function useIndividualTrainerWorkoutPlanDayByDayOfWeek(
  planId?: string | null,
  dayOfWeek?: DayOfWeek | string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['individualTrainerWorkoutPlanDayByDayOfWeek', planId, dayOfWeek],
    queryFn: async () => {
      if (!planId || !dayOfWeek) return null;
      return await fetchIndividualTrainerWorkoutPlanDayByDayOfWeek(planId, dayOfWeek as DayOfWeek);
    },
    enabled: options?.enabled !== undefined ? options.enabled : Boolean(planId && dayOfWeek),
  });
}

export function useSaveIndividualTrainerWorkoutPlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planDayData: SaveIndividualTrainerWorkoutPlanDayParams) => {
      return await saveIndividualTrainerWorkoutPlanDay(planDayData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDays', variables.planId],
      });
      if (variables.planDayId) {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlanDay', variables.planDayId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlan', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useSaveMultipleIndividualTrainerWorkoutPlanDays() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days: SaveIndividualTrainerWorkoutPlanDayParams[]) => {
      return await saveMultipleIndividualTrainerWorkoutPlanDays(days);
    },
    onSuccess: (_, variables) => {
      const planIds = Array.from(new Set(variables.map((d) => d.planId)));
      planIds.forEach((pid) => {
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlanDays', pid],
        });
        queryClient.invalidateQueries({
          queryKey: ['individualTrainerWorkoutPlan', pid],
        });
      });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useDeleteIndividualTrainerWorkoutPlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planDayId: string) => {
      return await deleteIndividualTrainerWorkoutPlanDay(planDayId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDays'] });
      queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlanDay'] });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

export function useMakeIndividualTrainerRestDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planDayId,
      planId,
      dayOfWeek,
    }: {
      planDayId: string;
      planId: string;
      dayOfWeek: DayOfWeek | string;
    }) => {
      return await makeIndividualTrainerRestDay(planDayId, planId, dayOfWeek);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDays', variables.planId],
      });
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlanDay', variables.planDayId],
      });
      queryClient.invalidateQueries({
        queryKey: ['individualTrainerWorkoutPlan', variables.planId],
      });
      queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan'] });
    },
  });
}

