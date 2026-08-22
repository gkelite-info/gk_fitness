import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { base64ToArrayBuffer } from '@/components/imageCompressor';

export interface GymCommunityStory {
  gymCommunityStoryId: string;
  gymId: string;
  createdBy: string;
  mediaUrl: string | null;
  caption: string | null;
  captionPositions: string[] | null;
  expiresAt: string;
  is_deleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  users?: {
    name: string;
    role: string;
    profilePhoto?: string | null;
  };
  views?: { viewedBy: string }[];
  likesCount?: number;
  commentsCount?: number;
  isLikedByMe?: boolean;
}

export async function fetchActiveStories(gymId: string, currentUserId: string) {
  try {
    // 1. Fetch blocked users (both ways)
    const [blockedByMe, blockedMe] = await Promise.all([
      supabase.from('gym_community_blocks').select('blockedId').eq('blockerId', currentUserId).eq('is_deleted', false),
      supabase.from('gym_community_blocks').select('blockerId').eq('blockedId', currentUserId).eq('is_deleted', false)
    ]);
    
    const blockedUserIds = [
      ...(blockedByMe.data?.map(d => d.blockedId) || []),
      ...(blockedMe.data?.map(d => d.blockerId) || [])
    ];

    // 2. Fetch non-expired, non-deleted stories for the gym
    const now = new Date().toISOString();
    let query = supabase
      .from('gym_community_stories')
      .select(`
        *,
        users (name, role, profilePhoto),
        gym_community_story_views (viewedBy),
        gym_community_story_likes (likedBy),
        gym_community_story_comments (count)
      `)
      .eq('gymId', gymId)
      .eq('is_deleted', false)
      .gt('expiresAt', now)
      .order('createdAt', { ascending: true }); // Chronological order for viewing

    const { data, error } = await query;
    if (error) throw error;

    // Filter out blocked users
    const filteredData = (data as any[]).filter(story => !blockedUserIds.includes(story.createdBy));
    
    // Group stories by user
    const groupedStories = new Map<string, { user: any, stories: GymCommunityStory[], allViewed: boolean, lastUpdated: number }>();
    
    for (const story of filteredData) {
      const isViewed = story.gym_community_story_views?.some((v: any) => v.viewedBy === currentUserId);
      const likes = story.gym_community_story_likes || [];
      const commentsData = story.gym_community_story_comments || [];
      
      const mappedStory = {
        ...story,
        views: story.gym_community_story_views,
        likesCount: likes.length,
        isLikedByMe: likes.some((l: any) => l.likedBy === currentUserId),
        commentsCount: commentsData[0]?.count || 0
      } as GymCommunityStory;

      if (groupedStories.has(story.createdBy)) {
        const group = groupedStories.get(story.createdBy)!;
        group.stories.push(mappedStory);
        if (!isViewed) group.allViewed = false;
        group.lastUpdated = Math.max(group.lastUpdated, new Date(story.createdAt).getTime());
      } else {
        groupedStories.set(story.createdBy, {
          user: story.users,
          stories: [mappedStory],
          allViewed: !!isViewed,
          lastUpdated: new Date(story.createdAt).getTime(),
        });
      }
    }

    // Convert map to array and sort:
    // 1. Current user's stories first
    // 2. Unseen stories, ordered by latest update
    // 3. Seen stories, ordered by latest update
    const result = Array.from(groupedStories.entries()).map(([userId, data]) => ({
      userId,
      user: data.user,
      stories: data.stories,
      allViewed: data.allViewed,
      lastUpdated: data.lastUpdated,
    }));

    result.sort((a, b) => {
      if (a.userId === currentUserId) return -1;
      if (b.userId === currentUserId) return 1;
      if (a.allViewed === b.allViewed) {
        return b.lastUpdated - a.lastUpdated; // Newer first
      }
      return a.allViewed ? 1 : -1; // Unseen first
    });

    return result;
  } catch (error) {
    console.error('[storiesHelper] fetchActiveStories Error:', error);
    throw error;
  }
}

export async function createStory(
  gymId: string, 
  createdBy: string, 
  mediaUri: string, 
  caption?: string,
  captionPositions?: string[]
) {
  try {
    const storyId = Crypto.randomUUID();
    let mediaUrl = null;

    if (mediaUri) {
      const base64 = await FileSystem.readAsStringAsync(mediaUri, { encoding: 'base64' });
      const arrayBuffer = base64ToArrayBuffer(base64);
      const ext = mediaUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${gymId}/${storyId}.${ext}`;
      
      const isVideo = ext === 'mp4' || ext === 'mov' || ext === 'm4v';
      const contentType = isVideo ? `video/${ext === 'mov' ? 'quicktime' : ext}` : `image/${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('community-stories')
        .upload(fileName, arrayBuffer, { contentType });
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('community-stories')
        .getPublicUrl(fileName);
        
      mediaUrl = publicUrlData.publicUrl;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('gym_community_stories')
      .insert([{
        gymCommunityStoryId: storyId,
        gymId,
        createdBy,
        mediaUrl,
        caption: caption || null,
        captionPositions: captionPositions || null,
        expiresAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[storiesHelper] createStory Error:', error);
    throw error;
  }
}

export async function markStoryViewed(storyId: string, viewedBy: string) {
  try {
    const { error } = await supabase
      .from('gym_community_story_views')
      .upsert({
        gymCommunityStoryViewId: Crypto.randomUUID(),
        gymCommunityStoryId: storyId,
        viewedBy,
        viewedAt: new Date().toISOString()
      }, {
        onConflict: 'gymCommunityStoryId, viewedBy'
      });
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[storiesHelper] markStoryViewed Error:', error);
    // Don't throw, this is a non-critical background operation
    return false;
  }
}

export async function deleteStory(storyId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('gym_community_stories')
      .update({ 
        is_deleted: true, 
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .eq('gymCommunityStoryId', storyId)
      .eq('createdBy', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[storiesHelper] deleteStory Error:', error);
    throw error;
  }
}

export async function fetchStoryViewers(storyId: string) {
  try {
    const { data, error } = await supabase
      .from('gym_community_story_views')
      .select(`
        viewedBy,
        viewedAt,
        users (name, profilePhoto, role)
      `)
      .eq('gymCommunityStoryId', storyId)
      .order('viewedAt', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[storiesHelper] fetchStoryViewers Error:', error);
    throw error;
  }
}

export async function toggleStoryLike(gymId: string, storyId: string, userId: string, isCurrentlyLiked: boolean) {
  if (isCurrentlyLiked) {
    const { error } = await supabase
      .from('gym_community_story_likes')
      .delete()
      .match({ gymId, gymCommunityStoryId: storyId, likedBy: userId });
    if (error) throw error;
  } else {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('gym_community_story_likes')
      .insert({ 
        gymCommunityStoryLikeId: Crypto.randomUUID(),
        gymId, 
        gymCommunityStoryId: storyId, 
        likedBy: userId,
        createdAt: now,
        updatedAt: now
      });
    if (error) throw error;
  }
}

export async function fetchStoryComments(storyId: string) {
  const { data, error } = await supabase
    .from('gym_community_story_comments')
    .select(`
      *,
      users (name, profilePhoto)
    `)
    .eq('gymCommunityStoryId', storyId)
    .order('createdAt', { ascending: false });

  if (error) throw error;
  return data;
}

export async function addStoryComment(gymId: string, storyId: string, userId: string, content: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('gym_community_story_comments')
    .insert({ 
      gymCommunityStoryCommentId: Crypto.randomUUID(),
      gymId, 
      gymCommunityStoryId: storyId, 
      commentedBy: userId, 
      content,
      createdAt: now,
      updatedAt: now
    })
    .select(`
      *,
      users (name, profilePhoto)
    `)
    .single();

  if (error) throw error;
  return data;
}
