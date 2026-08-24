import { useMutation } from '@tanstack/react-query';
import { uploadGymLeadLogo } from '@/helpers/gymLeads/gymLeadsHelper';

export function useUploadGymLeadLogo() {
  return useMutation({
    mutationFn: async (uri: string) => {
      const publicUrl = await uploadGymLeadLogo(uri);
      return publicUrl;
    },
    onError: (error) => {
      console.error('[useUploadGymLeadLogo] onError:', error);
    }
  });
}
