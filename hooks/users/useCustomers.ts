import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 10;

export function useCustomers(gymId: string | null, filter: string, debouncedSearch: string) {
  return useInfiniteQuery({
    queryKey: ['customers', gymId, filter, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      if (!gymId) throw new Error('Gym ID is required');

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('gym_customers')
        .select('*', { count: 'exact' })
        .eq('gymId', gymId);

      if (filter === 'active') {
        query = query.eq('is_Active', true);
      } else if (filter === 'expired') {
        query = query.eq('is_Active', false);
      }

      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim();
        query = query.or(`fullName.ilike.%${q}%,phone.ilike.%${q}%`);
      }

      query = query.order('createdAt', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      
      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        nextPage: (data && data.length === PAGE_SIZE) ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!gymId, // Only run the query if gymId is present
  });
}
