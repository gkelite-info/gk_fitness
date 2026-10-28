import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export enum PaymentMethod {
  UPI = 'UPI',
  CARD = 'CARD',
  NETBANKING = 'NETBANKING',
  WALLET = 'WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

export type CustomerPaymentMethod = PaymentMethod | 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | string;
export type CustomerPaymentStatus = PaymentStatus | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | string;

export interface CustomerGymPaymentAttributes {
  customerPaymentId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  paymentMethod: CustomerPaymentMethod;
  upiId?: string | null;
  amountPaid: number;
  status?: CustomerPaymentStatus;
  transactionId?: string | null;
  notes?: string | null;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;

  plan?: {
    planId?: string;
    planName: string;
    durationMonths?: string | number;
    price?: number;
  } | null;
  gym_customers?: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    is_Active?: boolean;
    users?: {
      profilePhoto?: string | null;
      status?: string | null;
      createdAt?: string | Date;
    } | null;
  } | null;
  gyms?: {
    gymName?: string;
    address?: string | null;
    phone?: string | null;
  } | null;
}

export interface SaveCustomerGymPaymentParams {
  customerPaymentId?: string;
  customerId: string;
  gymId: string;
  planId: string;
  paymentMethod: CustomerPaymentMethod;
  upiId?: string | null;
  amountPaid: number;
  status?: CustomerPaymentStatus;
  transactionId?: string | null;
  notes?: string | null;
}

export async function fetchCustomerGymPayments(gymId?: string, customerId?: string) {
  let query = supabase
    .from('customer_gym_payments')
    .select('*, plan:gym_membership_plans(planName, durationMonths, price), gym_customers(fullName, email, phone, is_Active, users!gym_customers_userId_fkey(profilePhoto, status, createdAt))')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  if (customerId) {
    query = query.eq('customerId', customerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[customerGymPaymentsHelper] fetchCustomerGymPayments Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchCustomerGymPaymentById(id: string) {
  const { data, error } = await supabase
    .from('customer_gym_payments')
    .select('*, plan:gym_membership_plans(planName, durationMonths, price), gym_customers(fullName, email, phone, is_Active), gyms(gymName, address, phone)')
    .eq('customerPaymentId', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[customerGymPaymentsHelper] fetchCustomerGymPaymentById Error:', error);
    throw error;
  }

  return data;
}

export async function saveCustomerGymPayment(paymentData: SaveCustomerGymPaymentParams) {
  const now = new Date().toISOString();

  let isUpdate = false;
  if (paymentData.customerPaymentId) {
    const { data } = await supabase
      .from('customer_gym_payments')
      .select('customerPaymentId')
      .eq('customerPaymentId', paymentData.customerPaymentId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (data) {
      isUpdate = true;
    }
  }

  if (isUpdate && paymentData.customerPaymentId) {
    const updatePayload: Record<string, any> = {
      customerId: paymentData.customerId,
      gymId: paymentData.gymId,
      planId: paymentData.planId,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      status: paymentData.status || PaymentStatus.PENDING,
      updatedAt: now,
    };
      if (paymentData.upiId !== undefined) {
        updatePayload.upiId = paymentData.upiId;
      }
      if (paymentData.transactionId !== undefined) {
        updatePayload.transactionId = paymentData.transactionId;
      }
      if (paymentData.notes !== undefined) {
        updatePayload.notes = paymentData.notes;
      }

      const { data, error } = await supabase
        .from('customer_gym_payments')
        .update(updatePayload)
        .eq('customerPaymentId', paymentData.customerPaymentId)
        .select();

      if (error) {
        console.error('[customerGymPaymentsHelper] saveCustomerGymPayment Update Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    } else {
      const generatedId = paymentData.customerPaymentId || Crypto.randomUUID();
      const insertPayload: Record<string, any> = {
        customerPaymentId: generatedId,
        customerId: paymentData.customerId,
        gymId: paymentData.gymId,
        planId: paymentData.planId,
        paymentMethod: paymentData.paymentMethod,
        upiId: paymentData.upiId || null,
        amountPaid: paymentData.amountPaid,
        status: paymentData.status || PaymentStatus.PENDING,
        transactionId: paymentData.transactionId || null,
        notes: paymentData.notes || null,
        is_deleted: false,
        createdAt: now,
        updatedAt: now,
      };

      const { data, error } = await supabase
        .from('customer_gym_payments')
        .insert([insertPayload])
        .select();

      if (error) {
        console.error('[customerGymPaymentsHelper] saveCustomerGymPayment Insert Error:', error);
        throw error;
      }

      return data ? data[0] : null;
    }
  }

  export async function deleteCustomerGymPayment(id: string) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('customer_gym_payments')
      .update({
        is_deleted: true,
        deletedAt: now,
        updatedAt: now,
      })
      .eq('customerPaymentId', id)
      .select();

    if (error) {
      console.error('[customerGymPaymentsHelper] deleteCustomerGymPayment Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }

  export async function fetchCustomerGymPaymentsPaginated(
    gymId: string,
    page: number,
    limit: number,
    searchQuery?: string,
    sortOrder: 'newest' | 'oldest' = 'newest',
    customerId?: string
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('customer_gym_payments')
      .select('*, gym_customers!inner(fullName, email, phone, is_Active, users!inner(profilePhoto, status, createdAt)), gym_membership_plans(planName, durationMonths, price)', { count: 'exact' })
      .eq('gymId', gymId)
      .eq('is_deleted', false)
      .order('createdAt', { ascending: sortOrder === 'oldest' });

    if (searchQuery) {
      query = query.ilike('gym_customers.fullName', `%${searchQuery}%`);
    }

    if (customerId) {
      query = query.eq('customerId', customerId);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('[customerGymPaymentsHelper] fetchCustomerGymPaymentsPaginated Error:', error);
      throw error;
    }

    return {
      data: data ?? [],
      total: count ?? 0,
    };
  }