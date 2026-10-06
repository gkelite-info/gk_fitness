import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGymEnquiry, GymEnquiry } from '@/helpers/enquiries/enquiriesHelper';
import { useUser } from '@/context/UserContext';

export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  const { gymId } = useUser();

  return useMutation({
    mutationFn: (enquiry: Partial<GymEnquiry>) => {
      if (!gymId) throw new Error('No gym ID found');
      return saveGymEnquiry(gymId, enquiry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymEnquiries'] });
    },
  });
}
