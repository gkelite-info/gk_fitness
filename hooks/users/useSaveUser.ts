import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveUser, SaveUserParams } from '@/helpers/user/userHelper';

export function useSaveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: SaveUserParams) => {
      const data = await saveUser(userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
