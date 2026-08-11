import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface BiometricCredentialPayload {
  credentialId?: string;
  gymId: string;
  customerId: string;
  deviceId: string;
  deviceUserId: string;
  hasFace?: boolean;
  hasFingerprint?: boolean;
  hasCard?: boolean;
  rfidCardNo?: string;
}

export const getBiometricCredentials = async (gymId: string) => {
  try {
    const { data, error } = await supabase
      .from("gym_biometric_credentials")
      .select(`
        *,
        customer:gym_customers(fullName, phone, email)
      `)
      .eq("gymId", gymId)
      .eq("is_deleted", false)
      .order("createdAt", { ascending: false });

    if (error) throw error;
    return { success: true, data: data };
  } catch (error: any) {
    console.error('[Biometric API] getBiometricCredentials error:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const upsertBiometricCredential = async (payload: BiometricCredentialPayload) => {
  try {
    const now = new Date().toISOString();

    const credData = {
      gymId: payload.gymId,
      customerId: payload.customerId,
      deviceId: payload.deviceId,
      deviceUserId: payload.deviceUserId.trim(),
      hasFace: payload.hasFace ?? false,
      hasFingerprint: payload.hasFingerprint ?? false,
      hasCard: payload.hasCard ?? false,
      rfidCardNo: payload.rfidCardNo?.trim() || null,
      updatedAt: now,
    };

    if (payload.credentialId) {
      // Update
      const { data, error } = await supabase
        .from("gym_biometric_credentials")
        .update(credData)
        .eq("credentialId", payload.credentialId)
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } else {
      // Insert
      // Check if this mapping already exists
      const { data: existing } = await supabase
        .from("gym_biometric_credentials")
        .select("credentialId")
        .eq("gymId", payload.gymId)
        .eq("customerId", payload.customerId)
        .eq("deviceId", payload.deviceId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (existing) {
        return { success: false, error: 'This customer is already enrolled on this device.' };
      }

      const newId = Crypto.randomUUID();
      const { data, error } = await supabase
        .from("gym_biometric_credentials")
        .insert([{ ...credData, credentialId: newId, createdAt: now }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    }
  } catch (error: any) {
    console.error('[Biometric API] upsertBiometricCredential error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteBiometricCredential = async (credentialId: string) => {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("gym_biometric_credentials")
      .update({ is_deleted: true, deletedAt: now })
      .eq("credentialId", credentialId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('[Biometric API] deleteBiometricCredential error:', error);
    return { success: false, error: error.message };
  }
};
