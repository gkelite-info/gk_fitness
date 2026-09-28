import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export type SessionStatus = 'pending' | 'completed' | 'cancelled';

export interface TrainerSessionAttributes {
  trainerSessionId?: string;
  customerTrainerId: string;
  sessionDate: string | Date;
  status: SessionStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveTrainerSessionParams {
  trainerSessionId?: string;
  customerTrainerId: string;
  sessionDate: string | Date;
  status?: SessionStatus;
}

export async function fetchTrainerSessionsByCustomerTrainerId(customerTrainerId: string) {
  const { data, error } = await supabase
    .from('trainer_sessions')
    .select('*')
    .eq('customerTrainerId', customerTrainerId)
    .order('sessionDate', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchTrainerSessionsByDateRange(customerTrainerId: string, startDate: string | Date, endDate: string | Date) {
  const { data, error } = await supabase
    .from('trainer_sessions')
    .select('*')
    .eq('customerTrainerId', customerTrainerId)
    .gte('sessionDate', new Date(startDate).toISOString())
    .lte('sessionDate', new Date(endDate).toISOString())
    .order('sessionDate', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchTrainerSessionsForDate(customerTrainerIds: string[], sessionDate: string | Date) {
  if (!customerTrainerIds || customerTrainerIds.length === 0) return [];

  const startOfDay = new Date(sessionDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(sessionDate);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('trainer_sessions')
    .select('*')
    .in('customerTrainerId', customerTrainerIds)
    .gte('sessionDate', startOfDay.toISOString())
    .lte('sessionDate', endOfDay.toISOString());

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function saveTrainerSession(params: SaveTrainerSessionParams) {
  if (params.trainerSessionId) {
    const payload = {
      status: params.status || 'pending',
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('trainer_sessions')
      .update(payload)
      .eq('trainerSessionId', params.trainerSessionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } else {
    const payload = {
      trainerSessionId: Crypto.randomUUID(),
      customerTrainerId: params.customerTrainerId,
      sessionDate: params.sessionDate instanceof Date ? params.sessionDate.toISOString() : params.sessionDate,
      status: params.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('trainer_sessions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}

export async function updateTrainerSessionStatus(trainerSessionId: string, status: SessionStatus) {
  const { data, error } = await supabase
    .from('trainer_sessions')
    .update({ 
      status,
      updatedAt: new Date().toISOString()
    })
    .eq('trainerSessionId', trainerSessionId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTrainerSession(trainerSessionId: string) {
  const { error } = await supabase
    .from('trainer_sessions')
    .delete()
    .eq('trainerSessionId', trainerSessionId);

  if (error) {
    throw error;
  }

  return true;
}
