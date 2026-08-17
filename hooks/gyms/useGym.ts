import { useQuery } from '@tanstack/react-query';
import { fetchGymById } from '@/helpers/gym/gymHelper';

export function useGym(gymId?: string | null) {
  return useQuery({
    queryKey: ['gym', gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const data = await fetchGymById(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}
