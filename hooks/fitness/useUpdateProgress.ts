import { useMutation, useQueryClient } from '@tanstack/react-query';
import { progressService, CustomerMeasurement } from '@/lib/services/progressService';
import { supabase } from '@/lib/supabase';
import { updateCustomerOnboarding } from '@/helpers/onboardingHelper';

export function useUpdateMeasurements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, measurements, loggedAt }: { userId: string, measurements: Partial<CustomerMeasurement>, loggedAt?: string }) => {
      return await progressService.logMeasurements(userId, measurements, loggedAt);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressData', variables.userId] });
    },
  });
}

export function useUploadProgressPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, base64Image, fileName, loggedAt }: { userId: string, base64Image: string, fileName: string, loggedAt?: string }) => {
      // 1. Upload the image to the storage bucket
      const publicUrl = await progressService.uploadPhotoFile(userId, base64Image, fileName);
      // 2. Create the database record
      return await progressService.logProgressPhoto(userId, publicUrl, loggedAt);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressData', variables.userId] });
    },
  });
}

export function useUpdateTargetWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, onboardingId, targetWeight }: { userId: string, onboardingId: string, targetWeight: string }) => {
      return await updateCustomerOnboarding({ onboardingId, targetWeight });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressData', variables.userId] });
    },
  });
}
