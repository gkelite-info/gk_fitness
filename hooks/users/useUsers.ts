import { useQuery } from '@tanstack/react-query';
import { fetchUsers, UserRole } from '@/helpers/user/userHelper';

export function useUsers(role?: UserRole) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const data = await fetchUsers(role);
      return data;
    },
  });
}
