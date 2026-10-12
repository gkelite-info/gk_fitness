import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubscriptionFeatures,
  fetchSubscriptionFeatureById,
  saveSubscriptionFeature,
  deleteSubscriptionFeature,
  SaveSubscriptionFeatureParams,
} from "@/helpers/superadmin/subscriptions/subscriptionFeatures";

export function useSubscriptionFeatures(subscriptionPlanId?: string | null) {
  return useQuery({
    queryKey: ["subscriptionFeatures", subscriptionPlanId],
    queryFn: async () => {
      if (!subscriptionPlanId) return [];
      return fetchSubscriptionFeatures(subscriptionPlanId);
    },
    enabled: !!subscriptionPlanId,
  });
}

export function useSubscriptionFeature(subscriptionFeatureId?: string | null) {
  return useQuery({
    queryKey: ["subscriptionFeature", subscriptionFeatureId],
    queryFn: async () => {
      if (!subscriptionFeatureId) return null;
      return fetchSubscriptionFeatureById(subscriptionFeatureId);
    },
    enabled: !!subscriptionFeatureId,
  });
}

export function useSaveSubscriptionFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveSubscriptionFeatureParams) => saveSubscriptionFeature(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["subscriptionFeatures", variables.subscriptionPlanId],
      });
      if (variables.subscriptionFeatureId) {
        queryClient.invalidateQueries({
          queryKey: ["subscriptionFeature", variables.subscriptionFeatureId],
        });
      }
    },
    onError: (error) => {
      console.error("[useSaveSubscriptionFeature] Error saving subscription feature:", error);
    },
  });
}

export function useDeleteSubscriptionFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionFeatureId: string) =>
      deleteSubscriptionFeature(subscriptionFeatureId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptionFeatures"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionFeature", variables] });
    },
    onError: (error) => {
      console.error("[useDeleteSubscriptionFeature] Error deleting subscription feature:", error);
    },
  });
}
