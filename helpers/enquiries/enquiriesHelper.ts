import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymEnquiry {
  enquiryId: string;
  gymId: string;
  name: string;
  phone: string;
  interestedIn: string;
  addedVia: string;
  source: string;
  enquiryCategory: string;
  followUpDate: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchGymEnquiries(gymId: string, page: number = 1, limit: number = 20, searchQuery?: string, status?: string) {
  let query = supabase
    .from('gym_enquiries')
    .select('*', { count: 'exact' })
    .eq('gymId', gymId)
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (searchQuery) {
    const term = `%${searchQuery}%`;
    query = query.or(`name.ilike.${term},phone.ilike.${term},interestedIn.ilike.${term}`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

  if (error) {
    if (error.code === 'PGRST103' || error.code === 'PGRST205' || error.code === '42P01') {
      // Table doesn't exist yet or schema cache hasn't updated
      return { data: [], total: 0 };
    }
    console.error('[enquiriesHelper] fetchGymEnquiries Error:', error);
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

export async function saveGymEnquiry(gymId: string, enquiry: Partial<GymEnquiry>) {
  const now = new Date().toISOString();

  if (enquiry.enquiryId) {
    const { data, error } = await supabase
      .from('gym_enquiries')
      .update({
        ...enquiry,
        updatedAt: now,
      })
      .eq('enquiryId', enquiry.enquiryId)
      .select();

    if (error) {
      console.error('[enquiriesHelper] saveGymEnquiry Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const insertPayload = {
      enquiryId: Crypto.randomUUID(),
      gymId,
      name: enquiry.name,
      phone: enquiry.phone,
      interestedIn: enquiry.interestedIn || 'Gym Membership',
      addedVia: enquiry.addedVia || 'Owner Added',
      source: enquiry.source || 'Walk-in',
      enquiryCategory: enquiry.enquiryCategory || 'Warm',
      followUpDate: enquiry.followUpDate || null,
      status: enquiry.status || 'New',
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('gym_enquiries')
      .insert([insertPayload])
      .select();

    if (error) {
      console.error('[enquiriesHelper] saveGymEnquiry Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}
