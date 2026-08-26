import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface CommunityProfile {
  gymCommunityProfileId: string;
  userId: string;
  username: string;
  bio: string | null;
  website: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  users?: {
    name: string;
    profilePhoto: string | null;
  };
}

export async function fetchCommunityProfile(userId: string): Promise<CommunityProfile | null> {
  const { data, error } = await supabase
    .from('gym_community_profiles')
    .select(`
      *,
      users!inner (
        name,
        profilePhoto
      )
    `)
    .eq('userId', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching community profile:', error);
    throw error;
  }

  if (data) return data;

  // Fallback: If no community profile exists yet, fetch basic user data
  // and construct a temporary profile object so the UI doesn't say "User not found".
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('name, profilePhoto')
    .eq('userId', userId)
    .single();

  if (userError || !userData) {
    return null;
  }

  return {
    gymCommunityProfileId: 'fallback-' + userId,
    userId,
    username: (userData.name || 'user').toLowerCase().replace(/[^a-z0-9._]/g, '') + '_' + Math.floor(1000 + Math.random() * 9000),
    bio: '',
    website: '',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    users: userData
  };
}

export async function checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
  let query = supabase
    .from('gym_community_profiles')
    .select('gymCommunityProfileId')
    .eq('username', username.toLowerCase());

  if (excludeUserId) {
    query = query.neq('userId', excludeUserId);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.error('Error checking username:', error);
    throw error;
  }

  return data.length === 0;
}

export async function upsertCommunityProfile(params: {
  userId: string;
  username: string;
  bio?: string;
  website?: string;
}) {
  const { userId, username, bio = '', website = '' } = params;
  
  const updatedAt = new Date().toISOString();

  const { data: existing } = await supabase
    .from('gym_community_profiles')
    .select('gymCommunityProfileId')
    .eq('userId', userId)
    .maybeSingle();

  let data, error;

  if (existing) {
    const res = await supabase
      .from('gym_community_profiles')
      .update({
        username: username.toLowerCase(),
        bio,
        website,
        updatedAt
      })
      .eq('userId', userId)
      .select()
      .single();
    data = res.data;
    error = res.error;
  } else {
    const res = await supabase
      .from('gym_community_profiles')
      .insert({
        gymCommunityProfileId: Crypto.randomUUID(),
        userId,
        username: username.toLowerCase(),
        bio,
        website,
        updatedAt,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();
    data = res.data;
    error = res.error;
  }

  if (error) {
    console.error('Error upserting community profile:', error);
    throw error;
  }

  return data;
}

export async function checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId) return false;
  
  const { data, error } = await supabase
    .from('gym_community_follows')
    .select('gymCommunityFollowId')
    .eq('followerId', followerId)
    .eq('followingId', followingId)
    .limit(1);

  if (error) {
    console.error('Error checking follow status:', error);
    return false;
  }

  return data.length > 0;
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('Cannot follow yourself');

  const { error } = await supabase
    .from('gym_community_follows')
    .insert({
      gymCommunityFollowId: Crypto.randomUUID(),
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  if (error) {
    if (error.code === '23505') return; // already following
    console.error('Error following user:', error);
    throw error;
  }
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('gym_community_follows')
    .delete()
    .eq('followerId', followerId)
    .eq('followingId', followingId);

  if (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}

export async function fetchFollowers(userId: string, currentUserId: string, page = 0, limit = 20) {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('gym_community_follows')
    .select(`
      followerId,
      users!gym_community_follows_followerId_fkey (
        name,
        profilePhoto
      )
    `)
    .eq('followingId', userId)
    .order('createdAt', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data;
}

export async function fetchFollowing(userId: string, currentUserId: string, page = 0, limit = 20) {
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from('gym_community_follows')
    .select(`
      followingId,
      users!gym_community_follows_followingId_fkey (
        name,
        profilePhoto
      )
    `)
    .eq('followerId', userId)
    .order('createdAt', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return data;
}

