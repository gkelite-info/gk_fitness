import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type IndividualPaymentMode = 'upi' | 'cash' | 'card' | 'netbanking' | 'wallet';
export type IndividualPaymentStatus = 'successful' | 'failed' | 'pending';

export interface IndividualCustomerPaymentAttributes {
  individualCustomerPaymentId?: string;
  userId: string;
  globalTrainerId: string;
  paymentMode: IndividualPaymentMode;
  amountPaid: number;
  transactionId?: string | null;
  status: IndividualPaymentStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;

  user?: {
    userId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    profilePhoto?: string | null;
  } | null;

  trainer?: {
    globalTrainerId: string;
    fullName: string;
    price?: number | null;
    specialization?: string | null;
  } | null;
}

export interface SaveIndividualCustomerPaymentParams {
  individualCustomerPaymentId?: string;
  userId: string;
  globalTrainerId: string;
  paymentMode?: IndividualPaymentMode;
  amountPaid: number;
  transactionId?: string | null;
  status?: IndividualPaymentStatus;
}

export const BASE_INDIVIDUAL_CUSTOMER_PAYMENT_SELECT = `
  *,
  user:users (
    userId,
    name,
    email,
    phone,
    profilePhoto
  ),
  trainer:global_trainers (
    globalTrainerId,
    fullName,
    price,
    specialization
  )
`;

export async function fetchIndividualCustomerPayments(
  userId?: string,
  globalTrainerId?: string
): Promise<IndividualCustomerPaymentAttributes[]> {
  try {
    let query = supabase
      .from('individual_customer_trainer_payments')
      .select(BASE_INDIVIDUAL_CUSTOMER_PAYMENT_SELECT)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    if (globalTrainerId) {
      query = query.eq('globalTrainerId', globalTrainerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[individualCustomerPayment] fetchIndividualCustomerPayments Error:', error);
      throw error;
    }

    return (data as IndividualCustomerPaymentAttributes[]) ?? [];
  } catch (err) {
    console.error('[individualCustomerPayment] fetchIndividualCustomerPayments caught:', err);
    throw err;
  }
}

export async function fetchIndividualCustomerPaymentById(
  individualCustomerPaymentId: string
): Promise<IndividualCustomerPaymentAttributes | null> {
  try {
    const { data, error } = await supabase
      .from('individual_customer_trainer_payments')
      .select(BASE_INDIVIDUAL_CUSTOMER_PAYMENT_SELECT)
      .eq('individualCustomerPaymentId', individualCustomerPaymentId)
      .is('deletedAt', null)
      .maybeSingle();

    if (error) {
      console.error('[individualCustomerPayment] fetchIndividualCustomerPaymentById Error:', error);
      throw error;
    }

    return (data as IndividualCustomerPaymentAttributes) ?? null;
  } catch (err) {
    console.error('[individualCustomerPayment] fetchIndividualCustomerPaymentById caught:', err);
    throw err;
  }
}

export async function saveIndividualCustomerPayment(
  params: SaveIndividualCustomerPaymentParams
): Promise<IndividualCustomerPaymentAttributes | null> {
  const now = new Date().toISOString();
  const paymentId = params.individualCustomerPaymentId || Crypto.randomUUID();

  const insertPayload = {
    individualCustomerPaymentId: paymentId,
    userId: params.userId,
    globalTrainerId: params.globalTrainerId,
    paymentMode: params.paymentMode || 'upi',
    amountPaid: Number(params.amountPaid) || 0,
    transactionId: params.transactionId || null,
    status: params.status || 'successful',
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from('individual_customer_trainer_payments')
    .insert([insertPayload])
    .select();

  if (error) {
    console.error('[individualCustomerPayment] saveIndividualCustomerPayment Error:', error);
    throw error;
  }

  return (data?.[0] as IndividualCustomerPaymentAttributes) ?? null;
}
