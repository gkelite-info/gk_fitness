import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymCheckInRuleAttributes {
  ruleId?: string;
  gymId: string;
  dailyLimit: number;
  minGapMinutes: number;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SaveGymCheckInRuleParams {
  ruleId?: string;
  gymId: string;
  dailyLimit: number;
  minGapMinutes: number;
  createdBy: string;
  createdAt?: string;
}

export async function fetchGymCheckInRule(gymId: string) {
  const { data, error } = await supabase
    .from('gym_check_in_rules')
    .select('*')
    .eq('gymId', gymId)
    .is('deletedAt', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[gymCheckInRulesHelper] fetchGymCheckInRule Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymCheckInRule(ruleData: SaveGymCheckInRuleParams) {
  const now = new Date().toISOString();

  const recordToUpsert = {
    ruleId: ruleData.ruleId || Crypto.randomUUID(),
    gymId: ruleData.gymId,
    dailyLimit: ruleData.dailyLimit,
    minGapMinutes: ruleData.minGapMinutes,
    createdBy: ruleData.createdBy,
    createdAt: ruleData.createdAt || now,
    updatedAt: now,
  };

  const { data, error } = await supabase
    .from('gym_check_in_rules')
    .upsert(recordToUpsert, { onConflict: 'gymId' })
    .select();

  if (error) {
    console.error('[gymCheckInRulesHelper] saveGymCheckInRule Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}
