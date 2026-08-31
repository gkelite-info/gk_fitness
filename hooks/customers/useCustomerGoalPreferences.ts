import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomerGoalPreference, saveCustomerGoalPreference, CustomerGoalPreferencePayload } from '@/helpers/customers/customerGoalPreferencesHelper';

export function useCustomerGoalPreference(userId?: string) {
  return useQuery({
    queryKey: ['customerGoalPreference', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await fetchCustomerGoalPreference(userId);
    },
    enabled: !!userId,
  });
}

export function useSaveCustomerGoalPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CustomerGoalPreferencePayload) => saveCustomerGoalPreference(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customerGoalPreference', variables.userId] });
    },
  });
}
