import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Helper function to fetch blocked user IDs
export async function fetchBlockedUsers(userId: string): Promise<string[]> {
  if (!userId) return [];

  const [blockedByMe, blockedMe] = await Promise.all([
    supabase.from('gym_community_blocks').select('blockedId').eq('blockerId', userId).eq('is_deleted', false),
    supabase.from('gym_community_blocks').select('blockerId').eq('blockedId', userId).eq('is_deleted', false)
  ]);
  
  const blockedUserIds = [
    ...(blockedByMe.data?.map(d => d.blockedId) || []),
    ...(blockedMe.data?.map(d => d.blockerId) || [])
  ];

  return Array.from(new Set(blockedUserIds));
}

// React Query hook for caching blocked users
export function useBlockedUsers(userId: string | null) {
  return useQuery({
    queryKey: ['blockedUsers', userId],
    queryFn: () => fetchBlockedUsers(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
