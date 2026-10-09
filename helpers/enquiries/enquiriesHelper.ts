import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymEnquiryAttributes {
  gymEnquiryId?: string;
  fullName: string;
  mobile: string;
  email: string;
  gender: 'male' | 'female' | 'others';
  interestedIn: 'membership' | 'personaltraining' | 'groupclass' | 'others';
  planId?: string | null;
  addedThrough: 'socialmedia' | 'walkin' | 'owner';
  enquirySource: 'google' | 'instagram' | 'facebook' | 'referral' | 'walkin' | 'owner' | 'others';
  notes?: string | null;
  enquiryCategory: 'hot' | 'warm' | 'cold';
  followUpDate: string | Date;
  gymId: string;
  createdBy?: string | null;
  status: 'new' | 'followup' | 'converted' | 'notinterested';
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymEnquiryParams {
  gymEnquiryId?: string;
  fullName: string;
  mobile: string;
  email: string;
  gender?: 'male' | 'female' | 'others';
  interestedIn?: 'membership' | 'personaltraining' | 'groupclass' | 'others';
  planId?: string | null;
  addedThrough?: 'socialmedia' | 'walkin' | 'owner';
  enquirySource?: 'google' | 'instagram' | 'facebook' | 'referral' | 'walkin' | 'owner' | 'others';
  notes?: string | null;
  enquiryCategory?: 'hot' | 'warm' | 'cold';
  followUpDate: string | Date;
  gymId: string;
  createdBy?: string | null;
  status?: 'new' | 'followup' | 'converted' | 'notinterested';
}

export async function fetchGymEnquiries(
  gymId: string, 
  page: number = 1, 
  limit: number = 20, 
  searchQuery?: string, 
  status?: string,
  category?: string,
  source?: string
) {
  let query = supabase
    .from('gym_enquiries')
    .select('*, plan:gym_membership_plans(planName, durationMonths), user:users!gym_enquiries_createdBy_fkey(name)', { count: 'exact' })
    .eq('gymId', gymId)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (searchQuery) {
    const term = `%${searchQuery}%`;
    query = query.or(`fullName.ilike.${term},mobile.ilike.${term}`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (category && category !== 'all') {
    query = query.eq('enquiryCategory', category);
  }

  if (source && source !== 'all') {
    query = query.eq('enquirySource', source);
  }

  const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

  if (error) {
    if (error.code === 'PGRST103' || error.code === 'PGRST205' || error.code === '42P01') {
      return { data: [], total: 0 };
    }
    console.error('[enquiriesHelper] fetchGymEnquiries Error:', error);
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchGymEnquiryById(gymEnquiryId: string) {
  const { data, error } = await supabase
    .from('gym_enquiries')
    .select('*, plan:gym_membership_plans(planName, durationMonths), user:users!gym_enquiries_createdBy_fkey(name)')
    .eq('gymEnquiryId', gymEnquiryId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymEnquiriesHelper] fetchGymEnquiryById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymEnquiry(enquiryData: SaveGymEnquiryParams) {
  const now = new Date().toISOString();

  if (enquiryData.gymEnquiryId) {
    const { data, error } = await supabase
      .from('gym_enquiries')
      .update({
        fullName: enquiryData.fullName,
        mobile: enquiryData.mobile,
        email: enquiryData.email,
        gender: enquiryData.gender ?? 'male',
        interestedIn: enquiryData.interestedIn ?? 'membership',
        planId: enquiryData.planId ?? null,
        addedThrough: enquiryData.addedThrough ?? 'owner',
        enquirySource: enquiryData.enquirySource ?? 'owner',
        notes: enquiryData.notes ?? null,
        enquiryCategory: enquiryData.enquiryCategory ?? 'cold',
        followUpDate: enquiryData.followUpDate,
        gymId: enquiryData.gymId,
        status: enquiryData.status ?? 'new',
        updatedAt: now,
      })
      .eq('gymEnquiryId', enquiryData.gymEnquiryId)
      .select();

    if (error) {
      console.error('[gymEnquiriesHelper] saveGymEnquiry Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedGymEnquiryId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_enquiries')
      .insert([
        {
          gymEnquiryId: generatedGymEnquiryId,
          fullName: enquiryData.fullName,
          mobile: enquiryData.mobile,
          email: enquiryData.email,
          gender: enquiryData.gender ?? 'male',
          interestedIn: enquiryData.interestedIn ?? 'membership',
          planId: enquiryData.planId ?? null,
          addedThrough: enquiryData.addedThrough ?? 'owner',
          enquirySource: enquiryData.enquirySource ?? 'owner',
          notes: enquiryData.notes ?? null,
          enquiryCategory: enquiryData.enquiryCategory ?? 'cold',
          followUpDate: enquiryData.followUpDate,
          gymId: enquiryData.gymId,
          createdBy: enquiryData.createdBy,
          status: enquiryData.status ?? 'new',
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[gymEnquiriesHelper] saveGymEnquiry Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymEnquiry(gymEnquiryId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_enquiries')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymEnquiryId', gymEnquiryId)
    .select();

  if (error) {
    console.error('[gymEnquiriesHelper] deleteGymEnquiry Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function updateGymEnquiryStatus(gymEnquiryId: string, status: 'new' | 'followup' | 'converted' | 'notinterested', category?: 'hot' | 'warm' | 'cold') {
  const now = new Date().toISOString();
  
  const updateData: any = {
    status: status,
    updatedAt: now,
  };
  
  if (category) {
    updateData.enquiryCategory = category;
  }

  const { data, error } = await supabase
    .from('gym_enquiries')
    .update(updateData)
    .eq('gymEnquiryId', gymEnquiryId)
    .select();

  if (error) {
    console.error('[gymEnquiriesHelper] updateGymEnquiryStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
