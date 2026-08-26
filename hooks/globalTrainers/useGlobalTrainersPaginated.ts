import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainersPaginated } from '@/helpers/globalTrainer/globalTrainerHelper';

export function useGlobalTrainersPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  statusFilter?: string,
  sortOrder: 'newest' | 'oldest' = 'newest'
) {
  return useQuery({
    queryKey: ['globalTrainersPaginated', page, limit, searchQuery, statusFilter, sortOrder],
    queryFn: () => fetchGlobalTrainersPaginated(page, limit, searchQuery, statusFilter, sortOrder),
  });
}
