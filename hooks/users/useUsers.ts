import { useQuery } from '@tanstack/react-query';
import {
  fetchUsers,
  fetchUserById,
  fetchUserByEmail,
  fetchUserByPhone,
  UserRole,
  UserFilterOptions,
  UserAttributes
} from '@/helpers/user/userHelper';

export function useUsers(filterOrRole?: UserRole | UserFilterOptions) {
  return useQuery<UserAttributes[]>({
    queryKey: ['users', filterOrRole],
    queryFn: async () => {
      const data = await fetchUsers(filterOrRole);
      return data;
    },
  });
}

export function useUserById(userId?: string | null) {
  return useQuery<UserAttributes | null>({
    queryKey: ['user', 'id', userId],
    queryFn: async () => {
      if (!userId) return null;
      const data = await fetchUserById(userId);
      return data;
    },
    enabled: !!userId,
  });
}

export function useUserByEmail(email?: string | null) {
  return useQuery<UserAttributes | null>({
    queryKey: ['user', 'email', email?.trim().toLowerCase()],
    queryFn: async () => {
      if (!email) return null;
      const data = await fetchUserByEmail(email);
      return data;
    },
    enabled: !!email && email.trim().length > 0,
  });
}

export function useUserByPhone(phone?: string | null) {
  return useQuery<UserAttributes | null>({
    queryKey: ['user', 'phone', phone?.trim()],
    queryFn: async () => {
      if (!phone) return null;
      const data = await fetchUserByPhone(phone);
      return data;
    },
    enabled: !!phone && phone.trim().length > 0,
  });
}
