import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyOwnerPaymentDetails } from '@/helpers/paymentDetails/ownerPaymentDetailsHelper';

export function useVerifyOwnerPaymentDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentDetailsId: string) => {
      return await verifyOwnerPaymentDetails(paymentDetailsId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentRequests'] });
    },
    onError: (error) => {
      console.error('[useVerifyOwnerPaymentDetails] Error:', error);
    }
  });
}
