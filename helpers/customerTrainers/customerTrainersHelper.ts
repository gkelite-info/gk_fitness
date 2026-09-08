import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface CustomerTrainerAttributes {
  customerTrainerId?: string;
  gymId: string;
  customerId: string;
  gymTrainerId: string;
  assignedOn: string | Date;
  weekDays: string[];
  timings: string;
  assignedBy: string;
  renewalOn?: string | Date | null;
  expiryOn?: string | Date | null;
  isActive?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveCustomerTrainerParams {
  customerTrainerId?: string;
  gymId: string;
  customerId: string;
  gymTrainerId: string;
  weekDays: string[];
  timings: string;
  assignedBy: string;
  renewalOn?: string | Date | null;
  expiryOn?: string | Date | null;
  isActive?: boolean;
}

export async function fetchCustomerTrainersByGym(gymId?: string) {
  let query = supabase
    .from('customer_trainers')
    .select('*, customer:gym_customers(*), trainer:gym_trainers(*, users!gym_trainers_userId_fkey(profilePhoto))')
    .eq('is_deleted', false)
    .order('assignedOn', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[customerTrainersHelper] fetchCustomerTrainersByGym Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchCustomerTrainerById(customerTrainerId: string) {
  const { data, error } = await supabase
    .from('customer_trainers')
    .select('*, customer:gym_customers(*), trainer:gym_trainers(*, users!gym_trainers_userId_fkey(profilePhoto))')
    .eq('customerTrainerId', customerTrainerId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[customerTrainersHelper] fetchCustomerTrainerById Error:', error);
    throw error;
  }

  return data;
}

export async function fetchAssignedTrainersByCustomer(customerId: string) {
  const { data, error } = await supabase
    .from('customer_trainers')
    .select('*, trainer:gym_trainers(*, users!gym_trainers_userId_fkey(profilePhoto))')
    .eq('customerId', customerId)
    .eq('is_deleted', false)
    .order('assignedOn', { ascending: false });

  if (error) {
    console.error('[customerTrainersHelper] fetchAssignedTrainersByCustomer Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchAssignedCustomersByTrainer(gymTrainerId: string) {
  const { data, error } = await supabase
    .from('customer_trainers')
    .select('*, customer:gym_customers(*, users(profilePhoto))')
    .eq('gymTrainerId', gymTrainerId)
    .eq('isActive', true)
    .eq('is_deleted', false)
    .is('deletedAt', null)
    .order('assignedOn', { ascending: false });

  if (error) {
    console.error('[customerTrainersHelper] fetchAssignedCustomersByTrainer Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchAssignedCustomersByTrainerPaginated(
  gymTrainerId: string,
  page = 1,
  limit = 10,
  searchQuery?: string
) {
  let query = supabase
    .from('customer_trainers')
    .select('*, customer:gym_customers(*, users(profilePhoto))', { count: 'exact' })
    .eq('gymTrainerId', gymTrainerId)
    .eq('isActive', true)
    .eq('is_deleted', false)
    .order('assignedOn', { ascending: false });

  if (searchQuery && searchQuery.trim().length > 0) {
    query = query.ilike('customer.fullName', `%${searchQuery.trim()}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('[customerTrainersHelper] fetchAssignedCustomersByTrainerPaginated Error:', error);
    throw error;
  }

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}

export async function saveCustomerTrainer(assignmentData: SaveCustomerTrainerParams) {
  const now = new Date().toISOString();

  if (assignmentData.customerTrainerId) {
    const updatePayload: any = {
        gymId: assignmentData.gymId,
        customerId: assignmentData.customerId,
        gymTrainerId: assignmentData.gymTrainerId,
        weekDays: assignmentData.weekDays,
        timings: assignmentData.timings,
        assignedBy: assignmentData.assignedBy,
        isActive: assignmentData.isActive ?? true,
        updatedAt: now,
    };
    if (assignmentData.renewalOn !== undefined) updatePayload.renewalOn = assignmentData.renewalOn;
    if (assignmentData.expiryOn !== undefined) updatePayload.expiryOn = assignmentData.expiryOn;

    const { data, error } = await supabase
      .from('customer_trainers')
      .update(updatePayload)
      .eq('customerTrainerId', assignmentData.customerTrainerId)
      .select();

    if (error) {
      console.error('[customerTrainersHelper] saveCustomerTrainer Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = assignmentData.customerTrainerId || Crypto.randomUUID();
    const insertPayload: any = {
          customerTrainerId: generatedId,
          gymId: assignmentData.gymId,
          customerId: assignmentData.customerId,
          gymTrainerId: assignmentData.gymTrainerId,
          assignedOn: now,
          weekDays: assignmentData.weekDays,
          timings: assignmentData.timings,
          assignedBy: assignmentData.assignedBy,
          isActive: assignmentData.isActive ?? true,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
    };
    if (assignmentData.renewalOn !== undefined) insertPayload.renewalOn = assignmentData.renewalOn;
    if (assignmentData.expiryOn !== undefined) insertPayload.expiryOn = assignmentData.expiryOn;

    const { data, error } = await supabase
      .from('customer_trainers')
      .insert([insertPayload])
      .select();

    if (error) {
      console.error('[customerTrainersHelper] saveCustomerTrainer Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteCustomerTrainer(customerTrainerId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_trainers')
    .update({
      isActive: false,
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('customerTrainerId', customerTrainerId)
    .select();

  if (error) {
    console.error('[customerTrainersHelper] deleteCustomerTrainer Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleCustomerTrainerActiveStatus(customerTrainerId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('customer_trainers')
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq('customerTrainerId', customerTrainerId)
    .select();

  if (error) {
    console.error('[customerTrainersHelper] toggleCustomerTrainerActiveStatus Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
