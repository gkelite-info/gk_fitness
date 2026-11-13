import { useQuery } from '@tanstack/react-query';
import { fetchGlobalTrainerByReferCode } from '@/helpers/globalTrainer/globalTrainerHelper';

export function useGlobalTrainerByReferCode(referCode?: string | null) {
  return useQuery({
    queryKey: ['globalTrainer', 'referCode', referCode?.trim()],
    queryFn: async () => {
      if (!referCode || !referCode.trim()) return null;
      const data = await fetchGlobalTrainerByReferCode(referCode.trim());
      return data;
    },
    enabled: !!referCode && !!referCode.trim(),
  });
}

