import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymAnnouncementAttributes {
  gymAnnouncementId?: string;
  gymId: string;
  message: string;
  announcementDate?: string | null;
  announcementTime?: string | null;
  createdBy: string;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymAnnouncementParams {
  gymAnnouncementId?: string;
  gymId: string;
  message: string;
  announcementDate?: string | null;
  announcementTime?: string | null;
  createdBy: string;
}

export async function fetchGymAnnouncements(gymId?: string) {
  let query = supabase
    .from('gym_announcements')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[gymAnnouncementsHelper] fetchGymAnnouncements Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function saveGymAnnouncement(announcementData: SaveGymAnnouncementParams) {
  const now = new Date().toISOString();

  if (announcementData.gymAnnouncementId) {
    const { data, error } = await supabase
      .from('gym_announcements')
      .update({
        gymId: announcementData.gymId,
        message: announcementData.message,
        announcementDate: announcementData.announcementDate,
        announcementTime: announcementData.announcementTime,
        updatedAt: now,
      })
      .eq('gymAnnouncementId', announcementData.gymAnnouncementId)
      .select();

    if (error) {
      console.error('[gymAnnouncementsHelper] saveGymAnnouncement Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = announcementData.gymAnnouncementId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_announcements')
      .insert([
        {
          gymAnnouncementId: generatedId,
          gymId: announcementData.gymId,
          message: announcementData.message,
          announcementDate: announcementData.announcementDate || null,
          announcementTime: announcementData.announcementTime || null,
          createdBy: announcementData.createdBy,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[gymAnnouncementsHelper] saveGymAnnouncement Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymAnnouncement(gymAnnouncementId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_announcements')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymAnnouncementId', gymAnnouncementId)
    .select();

  if (error) {
    console.error('[gymAnnouncementsHelper] deleteGymAnnouncement Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
