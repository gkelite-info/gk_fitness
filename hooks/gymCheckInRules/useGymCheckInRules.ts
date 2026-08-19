import { useQuery } from '@tanstack/react-query';
import { fetchGymCheckInRule } from '@/helpers/gymCheckInRules/gymCheckInRulesHelper';

export function useGymCheckInRules(gymId?: string) {
  return useQuery({
    queryKey: ['gymCheckInRules', gymId],
    queryFn: async () => {
      if (!gymId) return null;
      const data = await fetchGymCheckInRule(gymId);
      return data;
    },
    enabled: !!gymId,
  });
}
