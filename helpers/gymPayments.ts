import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

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
    const { data, error } = await supabase
      .from('gym_payments')
      .update({
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
      })
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
