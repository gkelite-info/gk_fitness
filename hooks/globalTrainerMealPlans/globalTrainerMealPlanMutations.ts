import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  saveGlobalTrainerMealPlan,
  updateGlobalTrainerMealPlan,
  deleteGlobalTrainerMealPlan,
  deactivateGlobalTrainerMealPlans,
  toggleGlobalTrainerMealPlanActiveStatus,
  SaveGlobalTrainerMealPlanParams,
  GlobalTrainerMealPlanAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlans';
import {
  saveGlobalTrainerMealPlanDay,
  updateGlobalTrainerMealPlanDay,
  deleteGlobalTrainerMealPlanDay,
  GlobalTrainerMealPlanDayAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlanDays';
import {
  saveGlobalTrainerMealPlanDayMeal,
  updateGlobalTrainerMealPlanDayMeal,
  deleteGlobalTrainerMealPlanDayMeal,
  GlobalTrainerMealPlanDayMealAttributes,
} from '@/helpers/globalTrainerMealPlans/globalTrainerMealPlanDayMeals';

export function useSaveGlobalTrainerMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planData: SaveGlobalTrainerMealPlanParams) => {
      return await saveGlobalTrainerMealPlan(planData);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerAssignedDietPlans'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
      if (variables.userId) {
        queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['activeGlobalTrainerMealPlan', variables.userId] });
      }
      if (variables.globalTrainerMealPlanId) {
        queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', null, variables.globalTrainerMealPlanId] });
      }
    },
    onError: (error) => {
      console.error('[useSaveGlobalTrainerMealPlan] Mutation error:', error);
    },
  });
}

export function useUpdateGlobalTrainerMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      globalTrainerMealPlanId,
      updates,
    }: {
      globalTrainerMealPlanId: string;
      updates: Partial<GlobalTrainerMealPlanAttributes>;
    }) => {
      return await updateGlobalTrainerMealPlan(globalTrainerMealPlanId, updates);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerAssignedDietPlans'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', data.userId] });
        queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan', data.userId] });
      }
    },
    onError: (error) => {
      console.error('[useUpdateGlobalTrainerMealPlan] Update error:', error);
    },
  });
}

export function useDeleteGlobalTrainerMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (globalTrainerMealPlanId: string) => {
      return await deleteGlobalTrainerMealPlan(globalTrainerMealPlanId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerAssignedDietPlans'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', data.userId] });
        queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan', data.userId] });
      }
    },
    onError: (error) => {
      console.error('[useDeleteGlobalTrainerMealPlan] Delete error:', error);
    },
  });
}

export function useDeactivateGlobalTrainerMealPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return await deactivateGlobalTrainerMealPlans(userId);
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', userId] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan', userId] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerAssignedDietPlans'] });
    },
    onError: (error) => {
      console.error('[useDeactivateGlobalTrainerMealPlans] Deactivation error:', error);
    },
  });
}

export function useToggleGlobalTrainerMealPlanActiveStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      globalTrainerMealPlanId,
      currentStatus,
    }: {
      globalTrainerMealPlanId: string;
      currentStatus: boolean;
    }) => {
      return await toggleGlobalTrainerMealPlanActiveStatus(globalTrainerMealPlanId, currentStatus);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlans'] });
      queryClient.invalidateQueries({ queryKey: ['globalTrainerAssignedDietPlans'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan', data.userId] });
        queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan', data.userId] });
      }
    },
    onError: (error) => {
      console.error('[useToggleGlobalTrainerMealPlanActiveStatus] Toggle error:', error);
    },
  });
}

export function useSaveGlobalTrainerMealPlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dayData: Partial<GlobalTrainerMealPlanDayAttributes>) => {
      return await saveGlobalTrainerMealPlanDay(dayData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useSaveGlobalTrainerMealPlanDay] Error:', error);
    },
  });
}

export function useUpdateGlobalTrainerMealPlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      globalTrainerMealPlanDayId,
      updates,
    }: {
      globalTrainerMealPlanDayId: string;
      updates: Partial<GlobalTrainerMealPlanDayAttributes>;
    }) => {
      return await updateGlobalTrainerMealPlanDay(globalTrainerMealPlanDayId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useUpdateGlobalTrainerMealPlanDay] Error:', error);
    },
  });
}

export function useDeleteGlobalTrainerMealPlanDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (globalTrainerMealPlanDayId: string) => {
      return await deleteGlobalTrainerMealPlanDay(globalTrainerMealPlanDayId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useDeleteGlobalTrainerMealPlanDay] Error:', error);
    },
  });
}

export function useSaveGlobalTrainerMealPlanDayMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealData: Partial<GlobalTrainerMealPlanDayMealAttributes>) => {
      return await saveGlobalTrainerMealPlanDayMeal(mealData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useSaveGlobalTrainerMealPlanDayMeal] Error:', error);
    },
  });
}

export function useUpdateGlobalTrainerMealPlanDayMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      globalTrainerMealPlanDayMealId,
      updates,
    }: {
      globalTrainerMealPlanDayMealId: string;
      updates: Partial<GlobalTrainerMealPlanDayMealAttributes>;
    }) => {
      return await updateGlobalTrainerMealPlanDayMeal(globalTrainerMealPlanDayMealId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useUpdateGlobalTrainerMealPlanDayMeal] Error:', error);
    },
  });
}

export function useDeleteGlobalTrainerMealPlanDayMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (globalTrainerMealPlanDayMealId: string) => {
      return await deleteGlobalTrainerMealPlanDayMeal(globalTrainerMealPlanDayMealId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalTrainerMealPlan'] });
      queryClient.invalidateQueries({ queryKey: ['todayGlobalTrainerMealPlan'] });
    },
    onError: (error) => {
      console.error('[useDeleteGlobalTrainerMealPlanDayMeal] Error:', error);
    },
  });
}

