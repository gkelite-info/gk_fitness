import { useQuery } from '@tanstack/react-query';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';

export function useOwnerGymId(userId: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ['ownerGymId', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await getOwnerGymId(userId);
    },
    enabled: !!userId,
  });
}
