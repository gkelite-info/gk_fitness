import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export interface GymLeadAttributes {
  gymLeadId?: string;
  fullName: string;
  email: string;
  mobile: string;
  alternateMobile?: string | null;
  address: string;
  pincode: number;
  gymName: string;
  gymEmail: string;
  gymMobile: string;
  gymAlternateMobile?: string | null;
  gymState: string;
  gymCity: string;
  gymAddress: string;
  gymPincode: number;
  noOfBranches: number;
  establishYear: string;
  note?: string | null;
  website?: string | null;
  logo?: string | null;
  status?: 'submitted' | string; // Assuming 'submitted' is default
  password?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymLeadParams {
  gymLeadId?: string;
  fullName: string;
  email: string;
  mobile: string;
  alternateMobile?: string | null;
  address: string;
  pincode: number;
  gymName: string;
  gymEmail: string;
  gymMobile: string;
  gymAlternateMobile?: string | null;
  gymState: string;
  gymCity: string;
  gymAddress: string;
  gymPincode: number;
  noOfBranches: number;
  establishYear: string;
  note?: string | null;
  website?: string | null;
  logo?: string | null;
  status?: string;
  password?: string;
}

export async function fetchGymLeads() {
  const { data, error } = await supabase
    .from('gym_leads')
    .select('*')
    .is('deletedAt', null)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[gymLeadsHelper] fetchGymLeads Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGymLeadById(gymLeadId: string) {
  const { data, error } = await supabase
    .from('gym_leads')
    .select('*')
    .eq('gymLeadId', gymLeadId)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[gymLeadsHelper] fetchGymLeadById Error:', error);
    throw error;
  }

  return data;
}

export async function fetchGymLeadByCredentials(email: string, passwordHash: string) {
  const { data, error } = await supabase
    .from('gym_leads')
    .select('*')
    .eq('email', email)
    .eq('password', passwordHash)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[gymLeadsHelper] fetchGymLeadByCredentials Error:', error);
    throw error;
  }

  return data;
}

export async function fetchGymLeadByIdentifier(identifier: string) {
  const { data, error } = await supabase
    .from('gym_leads')
    .select('*')
    .or(`email.eq.${identifier},mobile.eq.${identifier}`)
    .is('deletedAt', null)
    .maybeSingle();

  if (error) {
    console.error('[gymLeadsHelper] fetchGymLeadByIdentifier Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymLead(leadData: SaveGymLeadParams) {
  const now = new Date().toISOString();

  if (leadData.gymLeadId) {
    const { data, error } = await supabase
      .from('gym_leads')
      .update({
        fullName: leadData.fullName,
        email: leadData.email,
        mobile: leadData.mobile,
        alternateMobile: leadData.alternateMobile,
        address: leadData.address,
        pincode: leadData.pincode,
        gymName: leadData.gymName,
        gymEmail: leadData.gymEmail,
        gymMobile: leadData.gymMobile,
        gymAlternateMobile: leadData.gymAlternateMobile,
        gymState: leadData.gymState,
        gymCity: leadData.gymCity,
        gymAddress: leadData.gymAddress,
        gymPincode: leadData.gymPincode,
        noOfBranches: leadData.noOfBranches,
        establishYear: leadData.establishYear,
        note: leadData.note,
        website: leadData.website,
        logo: leadData.logo,
        status: leadData.status,
        ...(leadData.password ? { password: leadData.password } : {}),
        updatedAt: now,
      })
      .eq('gymLeadId', leadData.gymLeadId)
      .select();

    if (error) {
      console.error('[gymLeadsHelper] saveGymLead Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedGymLeadId = leadData.gymLeadId || Crypto.randomUUID();
    const insertPayload = {
      gymLeadId: generatedGymLeadId,
      fullName: leadData.fullName,
      email: leadData.email,
      mobile: leadData.mobile,
      alternateMobile: leadData.alternateMobile || null,
      address: leadData.address,
      pincode: leadData.pincode,
      gymName: leadData.gymName,
      gymEmail: leadData.gymEmail,
      gymMobile: leadData.gymMobile,
      gymAlternateMobile: leadData.gymAlternateMobile || null,
      gymState: leadData.gymState,
      gymCity: leadData.gymCity,
      gymAddress: leadData.gymAddress,
      gymPincode: leadData.gymPincode,
      noOfBranches: leadData.noOfBranches,
      establishYear: leadData.establishYear,
      note: leadData.note || null,
      website: leadData.website || null,
      logo: leadData.logo || null,
      status: leadData.status || 'submitted',
      password: leadData.password || '',
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase
      .from('gym_leads')
      .insert([insertPayload])
      .select();

    if (error) {
      console.error('[gymLeadsHelper] saveGymLead Insert Error:', error);
      console.error('[gymLeadsHelper] saveGymLead Insert Error Details:', JSON.stringify(error, null, 2));
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymLead(gymLeadId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_leads')
    .update({
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymLeadId', gymLeadId)
    .select();

  if (error) {
    console.error('[gymLeadsHelper] deleteGymLead Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function updateGymLeadStatus(gymLeadId: string, status: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_leads')
    .update({
      status,
      updatedAt: now,
    })
    .eq('gymLeadId', gymLeadId)
    .select();

  if (error) {
    console.error('[gymLeadsHelper] updateGymLeadStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function uploadGymLeadLogo(uri: string): Promise<string | null> {
  try {
    let uploadData: any;
    let contentType = 'image/jpeg';
    let fileExt = 'jpeg';

    if (uri.startsWith('data:')) {
      const [header, base64String] = uri.split(',');
      contentType = header.replace('data:', '').replace(';base64', '');
      fileExt = contentType.split('/')[1] || 'jpeg';
      uploadData = decode(base64String);
    } else if (Platform.OS === 'web') {
      const response = await fetch(uri);
      uploadData = await response.blob();
      contentType = uploadData.type || 'image/jpeg';
      fileExt = contentType.split('/')[1] || 'jpeg';
    } else {
      let fileUri = uri;
      if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://') && fileUri.startsWith('/')) {
        fileUri = `file://${fileUri}`;
      }
      const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
      uploadData = decode(base64);
      const uriParts = fileUri.split('.');
      fileExt = uriParts.length > 1 ? uriParts.pop() || 'jpeg' : 'jpeg';
      contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
    }

    const fileName = `${Crypto.randomUUID()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('gym-lead-logos')
      .upload(fileName, uploadData, {
        contentType,
      });

    if (error) {
      console.error('[gymLeadsHelper] uploadGymLeadLogo Error:', error);
      throw error;
    }

    if (data) {
      return fileName;
    }
    return null;
  } catch (error) {
    console.error('[gymLeadsHelper] Exception in uploadGymLeadLogo:', error);
    throw error;
  }
}
