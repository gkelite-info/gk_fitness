import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GlobalTrainerLeadAttributes {
  globalTrainerLeadId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit';
  experience: number;
  joiningDate: string;
  qualification: string;
  bio?: string | null;
  languagesSpoken: string[];
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: number;
  status?: 'submitted' | 'underreview' | 'approved' | 'rejected';
  password?: string;
  isActive?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGlobalTrainerLeadParams {
  globalTrainerLeadId?: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'others';
  mobile: string;
  alternateMobile?: string | null;
  email: string;
  specialization: 'strength' | 'fatloss' | 'crossfit';
  experience: number;
  joiningDate: string;
  qualification: string;
  bio?: string | null;
  languagesSpoken: string[];
  address: string;
  country: string;
  state: string;
  city: string;
  pincode: number;
  status?: 'submitted' | 'underreview' | 'approved' | 'rejected';
  password?: string;
  isActive?: boolean;
}

export async function fetchGlobalTrainerLeads(page: number = 1, limit: number = 10, searchQuery?: string, status?: string) {
  let query = supabase
    .from('global_trainer_leads')
    .select('*', { count: 'exact' })
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (searchQuery) {
    const term = `%${searchQuery}%`;
    query = query.or(`fullName.ilike.${term},mobile.ilike.${term},email.ilike.${term},city.ilike.${term}`);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('[globalTrainerLeadsHelper] fetchGlobalTrainerLeads Error:', error);
    throw error;
  }

  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchGlobalTrainerLeadById(globalTrainerLeadId: string) {
  const { data, error } = await supabase
    .from('global_trainer_leads')
    .select('*')
    .eq('globalTrainerLeadId', globalTrainerLeadId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerLeadsHelper] fetchGlobalTrainerLeadById Error:', error);
    throw error;
  }

  return data;
}

export async function fetchGlobalTrainerLeadByCredentials(email: string, passwordHash: string) {
  const { data, error } = await supabase
    .from('global_trainer_leads')
    .select('*')
    .eq('email', email)
    .eq('password', passwordHash)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerLeadsHelper] fetchGlobalTrainerLeadByCredentials Error:', error);
    throw error;
  }

  return data;
}

export async function fetchGlobalTrainerLeadByIdentifier(identifier: string) {
  const isEmail = identifier.includes('@');
  const column = isEmail ? 'email' : 'mobile';

  const { data, error } = await supabase
    .from('global_trainer_leads')
    .select('*')
    .eq(column, identifier.trim())
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[globalTrainerLeadsHelper] fetchGlobalTrainerLeadByIdentifier Error:', error);
    throw error;
  }

  return data;
}

export async function saveGlobalTrainerLead(leadData: SaveGlobalTrainerLeadParams) {
  const now = new Date().toISOString();

  if (leadData.globalTrainerLeadId) {
    const { data, error } = await supabase
      .from('global_trainer_leads')
      .update({
        fullName: leadData.fullName,
        dateOfBirth: leadData.dateOfBirth,
        gender: leadData.gender,
        mobile: leadData.mobile,
        alternateMobile: leadData.alternateMobile,
        email: leadData.email,
        specialization: leadData.specialization,
        experience: leadData.experience,
        joiningDate: leadData.joiningDate,
        qualification: leadData.qualification,
        bio: leadData.bio,
        languagesSpoken: leadData.languagesSpoken,
        address: leadData.address,
        country: leadData.country,
        state: leadData.state,
        city: leadData.city,
        pincode: leadData.pincode,
        status: leadData.status,
        ...(leadData.password ? { password: leadData.password } : {}),
        isActive: leadData.isActive ?? true,
        updatedAt: now,
      })
      .eq('globalTrainerLeadId', leadData.globalTrainerLeadId)
      .select();

    if (error) {
      console.error('[globalTrainerLeadsHelper] saveGlobalTrainerLead Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = leadData.globalTrainerLeadId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('global_trainer_leads')
      .insert([
        {
          globalTrainerLeadId: generatedId,
          fullName: leadData.fullName,
          dateOfBirth: leadData.dateOfBirth,
          gender: leadData.gender,
          mobile: leadData.mobile,
          alternateMobile: leadData.alternateMobile || null,
          email: leadData.email,
          specialization: leadData.specialization,
          experience: leadData.experience,
          joiningDate: leadData.joiningDate,
          qualification: leadData.qualification,
          bio: leadData.bio || null,
          languagesSpoken: leadData.languagesSpoken,
          address: leadData.address,
          country: leadData.country,
          state: leadData.state,
          city: leadData.city,
          pincode: leadData.pincode,
          status: leadData.status || 'submitted',
          password: leadData.password || '',
          isActive: leadData.isActive ?? true,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[globalTrainerLeadsHelper] saveGlobalTrainerLead Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGlobalTrainerLead(globalTrainerLeadId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('global_trainer_leads')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('globalTrainerLeadId', globalTrainerLeadId)
    .select();

  if (error) {
    console.error('[globalTrainerLeadsHelper] deleteGlobalTrainerLead Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function updateGlobalTrainerLeadStatus(globalTrainerLeadId: string, status: 'submitted' | 'underreview' | 'approved' | 'rejected') {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('global_trainer_leads')
    .update({
      status,
      updatedAt: now,
    })
    .eq('globalTrainerLeadId', globalTrainerLeadId)
    .select();

  if (error) {
    console.error('[globalTrainerLeadsHelper] updateGlobalTrainerLeadStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
