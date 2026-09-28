import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { saveGym, SaveGymParams } from '@/helpers/gym/gymHelper';

export function useUpdateGymDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gymData: SaveGymParams) => {
      const result = await saveGym(gymData);
      return result;
    },
    onSuccess: (data, variables) => {
      if (variables.gymId) {
        queryClient.invalidateQueries({ queryKey: ['gym', variables.gymId] });
      }
    },
  });
}

export function useUpdateGymLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gymId, imageUri }: { gymId: string; imageUri: string }) => {
      // 1. Read the image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const arrayBuffer = base64ToArrayBuffer(base64);
      const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${gymId}/logo_${Date.now()}.${ext}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('gym-logos')
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('gym-logos')
        .getPublicUrl(fileName);

      const logo = publicUrlData.publicUrl;

      // 4. Update the gyms table
      const { error: updateError } = await supabase
        .from('gyms')
        .update({ logo })
        .eq('gymId', gymId);

      if (updateError) throw updateError;

      return logo;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gym', variables.gymId] });
    },
  });
}
