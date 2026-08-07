import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymOwnerAttributes {
  gymOwnerId?: string;
  userId: string;
  gymId: string;
  ownerFullname: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAlternatePhone?: string | null;
  isActive?: boolean;
  is_deleted?: boolean;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymOwnerParams {
  gymOwnerId?: string;
  userId: string;
  gymId: string;
  ownerFullname: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerAlternatePhone?: string | null;
  isActive?: boolean;
  createdBy: string;
}

export async function fetchGymOwners(gymId?: string) {
  let query = supabase
    .from('gym_owners')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[gymOwnersHelper] fetchGymOwners Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGymOwnerById(gymOwnerId: string) {
  const { data, error } = await supabase
    .from('gym_owners')
    .select('*')
    .eq('gymOwnerId', gymOwnerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymOwnersHelper] fetchGymOwnerById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymOwner(ownerData: SaveGymOwnerParams) {
  const now = new Date().toISOString();

  if (ownerData.gymOwnerId) {
    const { data, error } = await supabase
      .from('gym_owners')
      .update({
        userId: ownerData.userId,
        gymId: ownerData.gymId,
        ownerFullname: ownerData.ownerFullname,
        ownerEmail: ownerData.ownerEmail,
        ownerPhone: ownerData.ownerPhone,
        ownerAlternatePhone: ownerData.ownerAlternatePhone,
        isActive: ownerData.isActive ?? true,
        updatedAt: now,
      })
      .eq('gymOwnerId', ownerData.gymOwnerId)
      .select();

    if (error) {
      console.error('[gymOwnersHelper] saveGymOwner Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedGymOwnerId = ownerData.gymOwnerId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_owners')
      .insert([
        {
          gymOwnerId: generatedGymOwnerId,
          userId: ownerData.userId,
          gymId: ownerData.gymId,
          ownerFullname: ownerData.ownerFullname,
          ownerEmail: ownerData.ownerEmail,
          ownerPhone: ownerData.ownerPhone,
          ownerAlternatePhone: ownerData.ownerAlternatePhone || null,
          isActive: ownerData.isActive ?? true,
          is_deleted: false,
          createdBy: ownerData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[gymOwnersHelper] saveGymOwner Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymOwner(gymOwnerId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_owners')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymOwnerId', gymOwnerId)
    .select();

  if (error) {
    console.error('[gymOwnersHelper] deleteGymOwner Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleGymOwnerActiveStatus(gymOwnerId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_owners')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('gymOwnerId', gymOwnerId)
    .select();

  if (error) {
    console.error('[gymOwnersHelper] toggleGymOwnerActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
