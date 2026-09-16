import { useQuery } from '@tanstack/react-query';
import { fetchOwnerPaymentDetails } from '@/helpers/paymentDetails/ownerPaymentDetailsHelper';

export function useOwnerPaymentDetails(gymId: string | null | undefined) {
  return useQuery({
    queryKey: ['ownerPaymentDetails', gymId],
    queryFn: async () => {
      if (!gymId) {
        return null;
      }
      const data = await fetchOwnerPaymentDetails(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}
