import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainers } from '@/helpers/globalTrainer/globalTrainerHelper';

export function useGlobalTrainers(enabled: boolean = true, searchQuery?: string) {
  return useQuery({
    queryKey: ['globalTrainers', searchQuery],
    queryFn: async () => {
      const data = await fetchGlobalTrainers(searchQuery);
      return data;
    },
    enabled,
  });
}
