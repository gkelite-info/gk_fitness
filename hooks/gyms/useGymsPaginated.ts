import { useQuery } from '@tanstack/react-query';
import { fetchGymsPaginated } from '@/helpers/gym/gymHelper';

export function useGymsPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  statusFilter?: string,
  createdBy?: string,
  sortOrder: 'newest' | 'oldest' = 'newest'
) {
  return useQuery({
    queryKey: ['gymsPaginated', page, limit, searchQuery, statusFilter, createdBy, sortOrder],
    queryFn: () => fetchGymsPaginated(page, limit, searchQuery, statusFilter, createdBy, sortOrder),
  });
}
