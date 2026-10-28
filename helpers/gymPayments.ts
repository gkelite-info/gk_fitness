import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { base64ToArrayBuffer, compressImage } from '@/components/imageCompressor';

export interface GymPaymentAttributes {
  gymPaymentId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  paymentMethod: string;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string;
  transactionId?: string | null;
  paymentProof?: string | null;
  notes?: string | null;
  paymentTakenBy: string;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymPaymentParams {
  gymPaymentId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  paymentMethod: string;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string;
  transactionId?: string | null;
  paymentProof?: string | null;
  notes?: string | null;
  paymentTakenBy: string;
}

export async function fetchGymPayments(gymId?: string) {
  let query = supabase
    .from('gym_payments')
    .select(`
      *,
      gym_customers (
        fullName,
        phone
      ),
      gym_membership_plans (
        planName,
        durationMonths
      )
    `)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[gymPaymentsHelper] fetchGymPayments Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGymPaymentsPaginated(
  gymId?: string,
  page: number = 1,
  limit: number = 10,
  filters?: { tab?: string; searchQuery?: string; customerId?: string; dateRange?: string; customDate?: string }
) {
  let query = supabase
    .from('gym_payments')
    .select(`
      *,
      gym_customers!inner (
        fullName,
        phone
      ),
      gym_membership_plans (
        planName,
        durationMonths
      )
    `, { count: 'exact' })
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  if (filters?.searchQuery) {
    query = query.ilike('gym_customers.fullName', `%${filters.searchQuery}%`);
  }

  if (filters?.customerId) {
    query = query.eq('customerId', filters.customerId);
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const range = filters?.dateRange || (filters?.tab === 'Today' ? 'today' : filters?.tab === 'This Month' ? 'month' : filters?.tab === 'All' ? 'all' : undefined);

  if (range === 'today') {
    query = query.eq('paymentDate', todayStr);
  } else if (range === 'month') {
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    query = query.gte('paymentDate', firstDay);
  } else if (range === '3months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    query = query.gte('paymentDate', dateStr);
  } else if (range === '6months') {
    const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    query = query.gte('paymentDate', dateStr);
  } else if (range === 'year') {
    const firstDayOfYear = `${now.getFullYear()}-01-01`;
    query = query.gte('paymentDate', firstDayOfYear);
  } else if (range === 'custom' && filters?.customDate) {
    query = query.eq('paymentDate', filters.customDate);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[gymPaymentsHelper] fetchGymPaymentsPaginated Error:', error);
    throw error;
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}

export async function fetchGymPaymentById(gymPaymentId: string) {
  const { data, error } = await supabase
    .from('gym_payments')
    .select('*')
    .eq('gymPaymentId', gymPaymentId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymPaymentsHelper] fetchGymPaymentById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymPayment(paymentData: SaveGymPaymentParams) {
  const now = new Date().toISOString();

  if (paymentData.gymPaymentId) {
    const updatePayload: Record<string, any> = {
      customerId: paymentData.customerId,
      gymId: paymentData.gymId,
      planId: paymentData.planId,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      paymentDate: paymentData.paymentDate,
      paymentTime: paymentData.paymentTime,
      transactionId: paymentData.transactionId,
      notes: paymentData.notes,
      paymentTakenBy: paymentData.paymentTakenBy,
      updatedAt: now,
    };

    if (paymentData.paymentProof !== undefined) {
      updatePayload.paymentProof = paymentData.paymentProof;
    }

    const { data, error } = await supabase
      .from('gym_payments')
      .update(updatePayload)
      .eq('gymPaymentId', paymentData.gymPaymentId)
      .select();

    if (error) {
      console.error('[gymPaymentsHelper] saveGymPayment Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedGymPaymentId = paymentData.gymPaymentId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_payments')
      .insert([
        {
          gymPaymentId: generatedGymPaymentId,
          customerId: paymentData.customerId,
          gymId: paymentData.gymId,
          planId: paymentData.planId,
          paymentMethod: paymentData.paymentMethod,
          amountPaid: paymentData.amountPaid,
          paymentDate: paymentData.paymentDate,
          paymentTime: paymentData.paymentTime,
          transactionId: paymentData.transactionId || null,
          paymentProof: paymentData.paymentProof || null,
          notes: paymentData.notes || null,
          paymentTakenBy: paymentData.paymentTakenBy,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[gymPaymentsHelper] saveGymPayment Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymPayment(gymPaymentId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_payments')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymPaymentId', gymPaymentId)
    .select();

  if (error) {
    console.error('[gymPaymentsHelper] deleteGymPayment Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function uploadPaymentProof(uri: string, fileExtension: string = 'jpg'): Promise<string | null> {
  try {
    let uploadUri = uri;
    try {
      const compressed = await compressImage(uri, { maxWidth: 1200, compress: 0.7 });
      uploadUri = compressed.uri;
    } catch (compressError) {
      console.warn('[gymPaymentsHelper] Image compression fallback to original:', compressError);
    }

    const fileName = `payment_proof_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    let fileData: ArrayBuffer | Blob;

    if (Platform.OS === 'web') {
      const response = await fetch(uploadUri);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uploadUri, {
        encoding: 'base64',
      });
      fileData = base64ToArrayBuffer(base64);
    }

    let contentType = 'image/jpeg';
    if (fileExtension.toLowerCase() === 'png') contentType = 'image/png';
    else if (fileExtension.toLowerCase() === 'pdf') contentType = 'application/pdf';
    else if (fileExtension.toLowerCase() === 'webp') contentType = 'image/webp';

    const { data, error } = await supabase.storage
      .from('gym-payment-proofs')
      .upload(fileName, fileData, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[gymPaymentsHelper] storage upload error:', error);
      throw error;
    }

    if (data) {
      const { data: publicData } = supabase.storage
        .from('gym-payment-proofs')
        .getPublicUrl(fileName);
      return publicData?.publicUrl || fileName;
    }

    return null;
  } catch (error: any) {
    console.error('[gymPaymentsHelper] uploadPaymentProof Error:', error);
    throw error;
  }
}

export async function deletePaymentProof(fileNameOrUrl: string): Promise<boolean> {
  try {
    let fileName = fileNameOrUrl;
    if (fileNameOrUrl.includes('/')) {
      fileName = fileNameOrUrl.split('/').pop() || fileNameOrUrl;
    }

    const { error } = await supabase.storage
      .from('gym-payment-proofs')
      .remove([fileName]);

    if (error) {
      console.error('[gymPaymentsHelper] deletePaymentProof Error:', error);
      throw error;
    }

    return true;
  } catch (error: any) {
    console.error('[gymPaymentsHelper] deletePaymentProof Error:', error);
    return false;
  }
}
