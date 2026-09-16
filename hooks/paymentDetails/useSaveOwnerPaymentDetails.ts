import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveOwnerPaymentDetails, SaveOwnerPaymentDetailsParams } from '@/helpers/paymentDetails/ownerPaymentDetailsHelper';

export function useSaveOwnerPaymentDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveOwnerPaymentDetailsParams) => {
      return await saveOwnerPaymentDetails(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ownerPaymentDetails', variables.gymId] });
    },
    onError: (error) => {
    }
  });
}
