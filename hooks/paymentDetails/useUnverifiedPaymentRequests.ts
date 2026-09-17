import { useQuery } from '@tanstack/react-query';
import { fetchPaymentRequests } from '@/helpers/paymentDetails/ownerPaymentDetailsHelper';

export function useUnverifiedPaymentRequests(isVerified: boolean = false) {
  return useQuery({
    queryKey: ['paymentRequests', isVerified],
    queryFn: async () => {
      const data = await fetchPaymentRequests(isVerified);
      return data;
    },
  });
}
