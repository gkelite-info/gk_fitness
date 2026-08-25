import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleGymActiveStatus } from '@/helpers/gym/gymHelper';

interface ToggleGymStatusParams {
  gymId: string;
  currentStatus: boolean;
}

export function useToggleGymStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, currentStatus }: ToggleGymStatusParams) => {
      const data = await toggleGymActiveStatus(gymId, currentStatus);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      queryClient.invalidateQueries({ queryKey: ['gym', variables.gymId] });
    },
    onError: (error) => {
      console.error('[useToggleGymStatus] Error toggling gym status:', error);
    },
  });
}
