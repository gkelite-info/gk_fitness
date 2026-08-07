import { useQuery } from '@tanstack/react-query';
import { fetchTrainers } from '@/helpers/trainers/trainerHelper';

export function useGymTrainers(gymId?: string) {
  return useQuery({
    queryKey: ['trainers', gymId],
    queryFn: async () => {
      const data = await fetchTrainers(gymId);
      return data;
    },
  });
}
