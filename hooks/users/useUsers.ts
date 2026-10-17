import { useQuery } from '@tanstack/react-query';
import { fetchUsers, fetchUserById, UserRole } from '@/helpers/user/userHelper';

export function useUsers(role?: UserRole) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const data = await fetchUsers(role);
      return data;
    },
  });
}

export function useUserById(userId?: string | null) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const data = await fetchUserById(userId);
      return data;
    },
    enabled: !!userId,
  });
}

