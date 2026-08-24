import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, CreateUserParams } from '@/helpers/otpHelper';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserParams) => {
      const data = await createUser(userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('[useCreateUser] onError:', error);
    }
  });
}
