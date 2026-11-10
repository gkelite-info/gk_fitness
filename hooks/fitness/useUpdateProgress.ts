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
      const cleanFileName = fileName.includes('/') ? fileName.split('/').pop()! : fileName;
      // 1. Upload the image to the storage bucket
      await progressService.uploadPhotoFile(userId, base64Image, cleanFileName);
      // 2. Create the database record saving ONLY the filename (e.g. 'progress-1794231481.jpg')
      return await progressService.logProgressPhoto(userId, cleanFileName, loggedAt);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressData', variables.userId] });
    },
  });
}

export function useUpdateTargetWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, onboardingId, targetWeight }: { userId: string, onboardingId?: string, targetWeight: string }) => {
      let existingId = onboardingId;
      
      if (!existingId) {
        const { data: existing } = await supabase.from('customer_onboarding').select('onboardingId').eq('createdBy', userId).limit(1).maybeSingle();
        if (existing?.onboardingId) {
          existingId = existing.onboardingId;
        }
      }

      if (existingId) {
        return await updateCustomerOnboarding({ onboardingId: existingId, targetWeight });
      } else {
        const { data: gymCust } = await supabase.from('gym_customers').select('gymId').eq('userId', userId).limit(1).maybeSingle();
        const gymId = gymCust?.gymId || null;
        
        const payload = {
          onboardingId: require('expo-crypto').randomUUID(),
          createdBy: userId,
          gymId: gymId || '00000000-0000-0000-0000-000000000000',
          targetWeight,
          weight: '0',
          height: '0',
          primaryGoal: 'stayfit',
          workoutLocation: 'both',
          workoutDays: [],
          preferWorkoutTime: 'flexible',
          dietType: 'vegetarian',
          foodAllergies: [],
          mealsPerDay: 3,
          dailyWaterGoal: '0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const { error } = await supabase.from('customer_onboarding').insert(payload);
        if (error) throw new Error(error.message);
        return true;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progressData', variables.userId] });
    },
  });
}
