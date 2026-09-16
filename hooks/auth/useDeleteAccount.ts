import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCustomerAccount } from '@/helpers/user/deleteAccountHelper';
import { router } from 'expo-router';
import { useUser } from '@/context/UserContext';

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { refreshUserContext } = useUser();

  return useMutation({
    mutationFn: async (userId: string) => {
      const data = await deleteCustomerAccount(userId);
      return data;
    },
    onSuccess: async () => {
      queryClient.clear();
      await refreshUserContext();
    },
    onError: (error) => {
      console.error('[useDeleteAccount] onError:', error);
    }
  });
}
