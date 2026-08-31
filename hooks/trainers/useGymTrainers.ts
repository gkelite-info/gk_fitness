import { useQuery } from '@tanstack/react-query';
import { fetchTrainers } from '@/helpers/trainers/trainerHelper';

export function useGymTrainers(gymId?: string, enabled: boolean = true, searchQuery?: string) {
  return useQuery({
    queryKey: ['trainers', gymId, searchQuery],
    queryFn: async () => {
      const data = await fetchTrainers(gymId, searchQuery);
      return data;
    },
    enabled,
  });
}
