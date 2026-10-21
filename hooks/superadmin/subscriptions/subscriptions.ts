import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSubscriptions,
  fetchSubscriptionsPaginated,
  fetchSubscriptionById,
  saveSubscription,
  deleteSubscription,
  toggleSubscriptionActiveStatus,
  SaveSubscriptionParams,
} from "@/helpers/superadmin/subscriptions/subscriptions";

export function useSubscriptions(
  createdBy?: string,
  planFor?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["subscriptions", createdBy, planFor],
    queryFn: () => fetchSubscriptions(createdBy, planFor),
    ...options,
  });
}

export function useSubscriptionsPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  statusFilter?: string,
  createdBy?: string,
  sortOrder: "newest" | "oldest" = "newest"
) {
  return useQuery({
    queryKey: [
      "subscriptionsPaginated",
      page,
      limit,
      searchQuery,
      statusFilter,
      createdBy,
      sortOrder,
    ],
    queryFn: () =>
      fetchSubscriptionsPaginated(page, limit, searchQuery, statusFilter, createdBy, sortOrder),
  });
}

export function useSubscription(subscriptionPlanId?: string | null) {
  return useQuery({
    queryKey: ["subscription", subscriptionPlanId],
    queryFn: async () => {
      if (!subscriptionPlanId) return null;
      const data = await fetchSubscriptionById(subscriptionPlanId);
      return data;
    },
    enabled: !!subscriptionPlanId,
  });
}

export function useSaveSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SaveSubscriptionParams) => saveSubscription(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionsPaginated"] });
      if (variables.subscriptionPlanId) {
        queryClient.invalidateQueries({
          queryKey: ["subscription", variables.subscriptionPlanId],
        });
      }
    },
    onError: (error) => {
      console.error("[useSaveSubscription] Error saving subscription:", error);
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionPlanId: string) => deleteSubscription(subscriptionPlanId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionsPaginated"] });
      queryClient.invalidateQueries({ queryKey: ["subscription", variables] });
    },
    onError: (error) => {
      console.error("[useDeleteSubscription] Error deleting subscription:", error);
    },
  });
}

interface ToggleSubscriptionStatusParams {
  subscriptionPlanId: string;
  currentStatus: boolean;
}

export function useToggleSubscriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionPlanId, currentStatus }: ToggleSubscriptionStatusParams) => {
      const data = await toggleSubscriptionActiveStatus(subscriptionPlanId, currentStatus);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptionsPaginated"] });
      queryClient.invalidateQueries({
        queryKey: ["subscription", variables.subscriptionPlanId],
      });
    },
    onError: (error) => {
      console.error("[useToggleSubscriptionStatus] Error toggling subscription status:", error);
    },
  });
}
