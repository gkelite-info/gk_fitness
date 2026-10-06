import { useQuery } from '@tanstack/react-query';
import { fetchGymEnquiries } from '@/helpers/enquiries/enquiriesHelper';
import { useUser } from '@/context/UserContext';

export function useEnquiries(page: number = 1, limit: number = 20, searchQuery?: string, status: string = 'all') {
  const { gymId } = useUser();

  return useQuery({
    queryKey: ['gymEnquiries', gymId, page, limit, searchQuery, status],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const result = await fetchGymEnquiries(gymId, page, limit, searchQuery, status);
      return result;
    },
    enabled: !!gymId,
  });
}
