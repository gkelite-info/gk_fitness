import { useQuery } from '@tanstack/react-query';
import { fetchGyms } from '@/helpers/gym/gymHelper';

export function useGyms(createdBy?: string) {
  return useQuery({
    queryKey: ['gyms', createdBy],
    queryFn: async () => {
      const data = await fetchGyms(createdBy);
      return data;
    },
  });
}
