import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface PersonalTrainerRequestAttributes {
  personalTrainerRequestId?: string;
  requestedBy: string;
  gymTrainerId: string;
  preferredWorkoutDays: string[];
  preferredWorkoutTime: string;
  applicationStatus?: 'submitted' | 'approved' | 'rejected';
  is_deleted?: boolean | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SavePersonalTrainerRequestParams {
  personalTrainerRequestId?: string;
  requestedBy: string;
  gymTrainerId: string;
  preferredWorkoutDays: string[];
  preferredWorkoutTime: string;
}

export async function fetchPersonalTrainerRequestsByUser(userId: string, retryCount = 0): Promise<any[]> {
  const { data, error } = await supabase
    .from('personal_trainer_requests')
    .select('*, gymTrainer:gym_trainers(*, user:users!gym_trainers_userId_fkey(*))')
    .eq('requestedBy', userId)
    .is('deletedAt', null)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[personalTrainerRequestsHelper] fetchByUser PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchPersonalTrainerRequestsByUser(userId, retryCount + 1);
    }
    console.error('[personalTrainerRequestsHelper] fetchByUser Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchPersonalTrainerRequestsByTrainer(gymTrainerId: string, retryCount = 0): Promise<any[]> {
  const { data, error } = await supabase
    .from('personal_trainer_requests')
    .select('*, user:users(*)')
    .eq('gymTrainerId', gymTrainerId)
    .is('deletedAt', null)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (error) {
    if (error.code === 'PGRST303' && retryCount < 3) {
      console.warn(`[personalTrainerRequestsHelper] fetchByTrainer PGRST303 error, retrying (${retryCount + 1}/3) in 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchPersonalTrainerRequestsByTrainer(gymTrainerId, retryCount + 1);
    }
    console.error('[personalTrainerRequestsHelper] fetchByTrainer Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function savePersonalTrainerRequest(requestData: SavePersonalTrainerRequestParams) {
  const now = new Date().toISOString();

  if (requestData.personalTrainerRequestId) {
    const { data, error } = await supabase
      .from('personal_trainer_requests')
      .update({
        requestedBy: requestData.requestedBy,
        gymTrainerId: requestData.gymTrainerId,
        preferredWorkoutDays: requestData.preferredWorkoutDays,
        preferredWorkoutTime: requestData.preferredWorkoutTime,
        updatedAt: now,
      })
      .eq('personalTrainerRequestId', requestData.personalTrainerRequestId)
      .select();

    if (error) {
      console.error('[personalTrainerRequestsHelper] save Request Update Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('personal_trainer_requests')
      .insert([
        {
          personalTrainerRequestId: generatedId,
          requestedBy: requestData.requestedBy,
          gymTrainerId: requestData.gymTrainerId,
          preferredWorkoutDays: requestData.preferredWorkoutDays,
          preferredWorkoutTime: requestData.preferredWorkoutTime,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error('[personalTrainerRequestsHelper] save Request Insert Error:', error);
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deletePersonalTrainerRequest(personalTrainerRequestId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('personal_trainer_requests')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('personalTrainerRequestId', personalTrainerRequestId)
    .select();

  if (error) {
    console.error('[personalTrainerRequestsHelper] delete Request Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
