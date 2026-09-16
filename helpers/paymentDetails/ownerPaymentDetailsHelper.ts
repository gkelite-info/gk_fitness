import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface OwnerPaymentDetailsAttributes {
  paymentDetailsId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string | null;
  gymId: string;
  createdBy: string;
  primarySettlementMethod: 'bank' | 'upi';
  isVerified?: boolean;
  isActive?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveOwnerPaymentDetailsParams {
  paymentDetailsId?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string | null;
  gymId: string;
  createdBy: string;
  primarySettlementMethod: 'bank' | 'upi';
  isVerified?: boolean;
  isActive?: boolean;
}

export async function fetchOwnerPaymentDetails(gymId: string) {
  const { data, error } = await supabase
    .from('owner_payment_details')
    .select('*')
    .eq('gymId', gymId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[ownerPaymentDetailsHelper] fetchOwnerPaymentDetails Error:', error);
    throw error;
  }

  return data;
}

export async function saveOwnerPaymentDetails(details: SaveOwnerPaymentDetailsParams) {
  const now = new Date().toISOString();

  if (details.paymentDetailsId) {
    const { data, error } = await supabase
      .from('owner_payment_details')
      .update({
        accountHolderName: details.accountHolderName,
        bankName: details.bankName,
        accountNumber: details.accountNumber,
        ifscCode: details.ifscCode,
        upiId: details.upiId,
        gymId: details.gymId,
        primarySettlementMethod: details.primarySettlementMethod,
        isVerified: details.isVerified ?? false,
        isActive: details.isActive ?? true,
        updatedAt: now,
      })
      .eq('paymentDetailsId', details.paymentDetailsId)
      .select();

    if (error) {
      console.error('[ownerPaymentDetailsHelper] saveOwnerPaymentDetails Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedPaymentDetailsId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('owner_payment_details')
      .insert([
        {
          paymentDetailsId: generatedPaymentDetailsId,
          accountHolderName: details.accountHolderName,
          bankName: details.bankName,
          accountNumber: details.accountNumber,
          ifscCode: details.ifscCode,
          upiId: details.upiId || null,
          gymId: details.gymId,
          createdBy: details.createdBy,
          primarySettlementMethod: details.primarySettlementMethod,
          isVerified: details.isVerified ?? false,
          isActive: details.isActive ?? true,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[ownerPaymentDetailsHelper] saveOwnerPaymentDetails Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function fetchOwnerPaymentDetailsById(paymentDetailsId: string) {
  const { data, error } = await supabase
    .from('owner_payment_details')
    .select('*')
    .eq('paymentDetailsId', paymentDetailsId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[ownerPaymentDetailsHelper] fetchOwnerPaymentDetailsById Error:', error);
    throw error;
  }

  return data;
}

export async function deleteOwnerPaymentDetails(paymentDetailsId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('owner_payment_details')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('paymentDetailsId', paymentDetailsId)
    .select();

  if (error) {
    console.error('[ownerPaymentDetailsHelper] deleteOwnerPaymentDetails Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleOwnerPaymentDetailsActiveStatus(paymentDetailsId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('owner_payment_details')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('paymentDetailsId', paymentDetailsId)
    .select();

  if (error) {
    console.error('[ownerPaymentDetailsHelper] toggleOwnerPaymentDetailsActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
