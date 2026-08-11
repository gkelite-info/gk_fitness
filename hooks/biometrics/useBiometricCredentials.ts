import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBiometricCredentials,
  upsertBiometricCredential,
  deleteBiometricCredential,
  BiometricCredentialPayload
} from '@/helpers/biometrics/biometricCredentialAPI';

export function useBiometricCredentials(gymId?: string) {
  return useQuery({
    queryKey: ['biometricCredentials', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const res = await getBiometricCredentials(gymId);
      if (!res.success) throw new Error(res.error);
      return res.data || [];
    },
    enabled: !!gymId,
  });
}

export function useSaveBiometricCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BiometricCredentialPayload) => upsertBiometricCredential(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['biometricCredentials', variables.gymId] });
    },
  });
}

export function useDeleteBiometricCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ credentialId, gymId }: { credentialId: string; gymId: string }) => 
      deleteBiometricCredential(credentialId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['biometricCredentials', variables.gymId] });
    },
  });
}
