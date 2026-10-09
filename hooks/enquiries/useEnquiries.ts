import { useQuery } from '@tanstack/react-query';
import { fetchGymEnquiries, fetchGymEnquiryById } from '@/helpers/enquiries/enquiriesHelper';
import { useUser } from '@/context/UserContext';

export function useEnquiries(
  page: number = 1, 
  limit: number = 20, 
  searchQuery?: string, 
  status: string = 'all',
  category: string = 'all',
  source: string = 'all'
) {
  const { gymId } = useUser();

  return useQuery({
    queryKey: ['gymEnquiries', gymId, page, limit, searchQuery, status, category, source],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const result = await fetchGymEnquiries(gymId, page, limit, searchQuery, status, category, source);
      return result;
    },
    enabled: !!gymId,
  });
}

export function useEnquiryById(gymEnquiryId?: string) {
  return useQuery({
    queryKey: ['gymEnquiry', gymEnquiryId],
    queryFn: async () => {
      if (!gymEnquiryId) return null;
      const data = await fetchGymEnquiryById(gymEnquiryId);
      return data;
    },
    enabled: !!gymEnquiryId,
  });
}
