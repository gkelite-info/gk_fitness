import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import {
  fetchCommunityProfile,
  upsertCommunityProfile,
  checkUsernameAvailability,
  checkIsFollowing,
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing
} from '@/helpers/community/profileHelper';

export function useCommunityProfile(userId: string) {
  return useQuery({
    queryKey: ['communityProfile', userId],
    queryFn: () => fetchCommunityProfile(userId),
    enabled: !!userId,
  });
}

export function useCheckUsername(username: string, excludeUserId?: string) {
  return useQuery({
    queryKey: ['checkUsername', username],
    queryFn: () => checkUsernameAvailability(username, excludeUserId),
    enabled: !!username && username.length >= 3,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: upsertCommunityProfile,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityProfile', variables.userId] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });
}

export function useIsFollowing(followerId: string, followingId: string) {
  return useQuery({
    queryKey: ['isFollowing', followerId, followingId],
    queryFn: () => checkIsFollowing(followerId, followingId),
    enabled: !!followerId && !!followingId,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: string; followingId: string }) => 
      followUser(followerId, followingId),
    onMutate: async ({ followerId, followingId }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowing', followerId, followingId] });
      const previous = queryClient.getQueryData(['isFollowing', followerId, followingId]);
      queryClient.setQueryData(['isFollowing', followerId, followingId], true);
      return { previous };
    },
    onError: (err, { followerId, followingId }, context) => {
      queryClient.setQueryData(['isFollowing', followerId, followingId], context?.previous);
      toast.error('Failed to follow user');
    },
    onSettled: (data, err, { followerId, followingId }) => {
      if (!err) toast.success('Following user');
      queryClient.invalidateQueries({ queryKey: ['isFollowing', followerId, followingId] });
      queryClient.invalidateQueries({ queryKey: ['communityProfile', followingId] });
      queryClient.invalidateQueries({ queryKey: ['communityProfile', followerId] });
    }
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: string; followingId: string }) => 
      unfollowUser(followerId, followingId),
    onMutate: async ({ followerId, followingId }) => {
      await queryClient.cancelQueries({ queryKey: ['isFollowing', followerId, followingId] });
      const previous = queryClient.getQueryData(['isFollowing', followerId, followingId]);
      queryClient.setQueryData(['isFollowing', followerId, followingId], false);
      return { previous };
    },
    onError: (err, { followerId, followingId }, context) => {
      queryClient.setQueryData(['isFollowing', followerId, followingId], context?.previous);
      toast.error('Failed to unfollow user');
    },
    onSettled: (data, err, { followerId, followingId }) => {
      if (!err) toast.success('Unfollowed user');
      queryClient.invalidateQueries({ queryKey: ['isFollowing', followerId, followingId] });
      queryClient.invalidateQueries({ queryKey: ['communityProfile', followingId] });
      queryClient.invalidateQueries({ queryKey: ['communityProfile', followerId] });
    }
  });
}

export function useFollowersList(userId: string, currentUserId: string, page = 0, limit = 20) {
  return useQuery({
    queryKey: ['followers', userId, page, limit],
    queryFn: () => fetchFollowers(userId, currentUserId, page, limit),
    enabled: !!userId,
  });
}

export function useFollowingList(userId: string, currentUserId: string, page = 0, limit = 20) {
  return useQuery({
    queryKey: ['following', userId, page, limit],
    queryFn: () => fetchFollowing(userId, currentUserId, page, limit),
    enabled: !!userId,
  });
}
