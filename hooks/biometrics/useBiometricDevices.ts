import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBiometricDevices,
  upsertBiometricDevice,
  deleteBiometricDevice,
  BiometricDevicePayload
} from '@/helpers/biometrics/biometricDeviceAPI';

export function useBiometricDevices(gymId?: string) {
  return useQuery({
    queryKey: ['biometricDevices', gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const res = await getBiometricDevices(gymId);
      if (!res.success) throw new Error(res.error);
      return res.data || [];
    },
    enabled: !!gymId,
  });
}

export function useSaveBiometricDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BiometricDevicePayload) => upsertBiometricDevice(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['biometricDevices', variables.gymId] });
    },
  });
}

export function useDeleteBiometricDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, gymId }: { deviceId: string; gymId: string }) => 
      deleteBiometricDevice(deviceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['biometricDevices', variables.gymId] });
    },
  });
}
