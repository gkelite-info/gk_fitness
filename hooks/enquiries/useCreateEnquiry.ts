import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveGymEnquiry, SaveGymEnquiryParams } from '@/helpers/enquiries/enquiriesHelper';
import { useUser } from '@/context/UserContext';

export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  const { gymId } = useUser();

  return useMutation({
    mutationFn: (enquiry: Omit<SaveGymEnquiryParams, 'gymId'>) => {
      if (!gymId) throw new Error('No gym ID found');
      return saveGymEnquiry({ ...enquiry, gymId });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gymEnquiries'] });
      if (variables.gymEnquiryId) {
        queryClient.invalidateQueries({ queryKey: ['gymEnquiry', variables.gymEnquiryId] });
      }
    },
  });
}
