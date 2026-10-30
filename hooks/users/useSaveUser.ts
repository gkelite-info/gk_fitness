import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  saveUser,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  updateUserProfilePhoto,
  updateUserVerification,
  SaveUserParams,
  UserStatus,
  UserAttributes
} from '@/helpers/user/userHelper';

export function useSaveUser() {
  const queryClient = useQueryClient();

  return useMutation<UserAttributes | null, Error, SaveUserParams>({
    mutationFn: async (userData: SaveUserParams) => {
      const data = await saveUser(userData);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', data.userId] });
      }
      if (data?.email) {
        queryClient.invalidateQueries({ queryKey: ['user', 'email', data.email.toLowerCase()] });
      }
      if (data?.phone) {
        queryClient.invalidateQueries({ queryKey: ['user', 'phone', data.phone] });
      }
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserAttributes | null, Error, SaveUserParams>({
    mutationFn: async (userData: SaveUserParams) => {
      const data = await createUser(userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation<UserAttributes | null, Error, { userId: string; updates: Partial<SaveUserParams> }>({
    mutationFn: async ({ userId, updates }) => {
      const data = await updateUser(userId, updates);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', data.userId] });
      }
      if (data?.email) {
        queryClient.invalidateQueries({ queryKey: ['user', 'email', data.email.toLowerCase()] });
      }
      if (data?.phone) {
        queryClient.invalidateQueries({ queryKey: ['user', 'phone', data.phone] });
      }
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation<UserAttributes | null, Error, { userId: string; currentStatus: UserStatus }>({
    mutationFn: async ({ userId, currentStatus }) => {
      const data = await toggleUserStatus(userId, currentStatus);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', data.userId] });
      }
    },
  });
}

export function useUpdateUserProfilePhoto() {
  const queryClient = useQueryClient();

  return useMutation<UserAttributes | null, Error, { userId: string; profilePhoto: string | null }>({
    mutationFn: async ({ userId, profilePhoto }) => {
      const data = await updateUserProfilePhoto(userId, profilePhoto);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', data.userId] });
      }
    },
  });
}

export function useUpdateUserVerification() {
  const queryClient = useQueryClient();

  return useMutation<
    UserAttributes | null,
    Error,
    { userId: string; verification: { isEmailVerified?: boolean; isPhoneVerified?: boolean } }
  >({
    mutationFn: async ({ userId, verification }) => {
      const data = await updateUserVerification(userId, verification);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (data?.userId) {
        queryClient.invalidateQueries({ queryKey: ['user', 'id', data.userId] });
      }
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: async (userId: string) => {
      return await deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
