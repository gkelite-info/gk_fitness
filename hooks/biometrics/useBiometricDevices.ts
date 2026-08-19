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

export function useBiometricDevicesPaginated(gymId?: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ['biometricDevicesPaginated', gymId, page, limit],
    queryFn: async () => {
      if (!gymId) return { data: [], total: 0 };
      const res = await getBiometricDevices(gymId, page, limit);
      if (!res.success) throw new Error(res.error || 'Failed to fetch devices');
      return { data: res.data || [], total: res.total || 0 };
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
