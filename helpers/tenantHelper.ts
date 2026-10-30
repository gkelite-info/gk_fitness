import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const TENANT_KEY = 'selectedGym';

export interface SelectedGym {
  gymId: string;
  gymName: string;
  logo?: string | null;
}

export const getSelectedGym = async (): Promise<SelectedGym | null> => {
  try {
    const data = await AsyncStorage.getItem(TENANT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[tenantHelper] getSelectedGym Error:', error);
    return null;
  }
};

export const setSelectedGym = async (gym: SelectedGym): Promise<void> => {
  try {
    await AsyncStorage.setItem(TENANT_KEY, JSON.stringify(gym));
  } catch (error) {
    console.error('[tenantHelper] setSelectedGym Error:', error);
  }
};

export const clearSelectedGym = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TENANT_KEY);
  } catch (error) {
    console.error('[tenantHelper] clearSelectedGym Error:', error);
  }
};

export interface GymAuthorizationResult {
  isAuthorized: boolean;
  userGymId?: string | null;
  role?: string | null;
  reason?: 'MATCH' | 'DIFFERENT_GYM' | 'NO_MEMBERSHIP_FOUND' | 'NOT_GYM_BOUND' | 'ERROR';
}

/**
 * Validates whether an authenticated user belongs to the selected gym.
 * Handles customer, trainer, and owner roles with all identifier fallbacks (userId, customerId, email).
 */
export async function verifyUserGymMembership(
  userId: string,
  email: string | null | undefined,
  selectedGymId: string
): Promise<GymAuthorizationResult> {
  if (!selectedGymId) {
    return { isAuthorized: true, reason: 'NOT_GYM_BOUND' };
  }

  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    // 1. Fetch user role from users table
    const { data: userRec } = await supabase
      .from('users')
      .select('role')
      .eq('userId', userId)
      .maybeSingle();

    const role = (userRec?.role || '').trim().toLowerCase();
    const cleanRole = role.replace(/[\s_-]/g, '');

    // Pure global/admin roles that are never gym-restricted
    if (cleanRole === 'superadmin' || cleanRole === 'globaltrainer' || cleanRole === 'individual') {
      return { isAuthorized: true, role, reason: 'NOT_GYM_BOUND' };
    }

    // 2. Query gym_customers with all fallbacks (userId, customerId, email)
    const orCust = [`userId.eq.${userId}`, `customerId.eq.${userId}`];
    if (cleanEmail) {
      orCust.push(`email.eq.${cleanEmail}`);
    }

    const { data: customerRows } = await supabase
      .from('gym_customers')
      .select('customerId, gymId, is_deleted')
      .or(orCust.join(','))
      .eq('is_deleted', false);

    if (customerRows && customerRows.length > 0) {
      const match = customerRows.find((c: any) => c.gymId === selectedGymId);
      if (match) {
        return { isAuthorized: true, userGymId: selectedGymId, role: 'customer', reason: 'MATCH' };
      }
      return {
        isAuthorized: false,
        userGymId: customerRows[0].gymId,
        role: 'customer',
        reason: 'DIFFERENT_GYM',
      };
    }

    // 3. Query gym_trainers
    const orTrainer = [`userId.eq.${userId}`];
    if (cleanEmail) {
      orTrainer.push(`email.eq.${cleanEmail}`);
    }

    const { data: trainerRows } = await supabase
      .from('gym_trainers')
      .select('gymTrainerId, gymId, is_deleted')
      .or(orTrainer.join(','))
      .eq('is_deleted', false);

    if (trainerRows && trainerRows.length > 0) {
      const match = trainerRows.find((t: any) => t.gymId === selectedGymId);
      if (match) {
        return { isAuthorized: true, userGymId: selectedGymId, role: 'trainer', reason: 'MATCH' };
      }
      return {
        isAuthorized: false,
        userGymId: trainerRows[0].gymId,
        role: 'trainer',
        reason: 'DIFFERENT_GYM',
      };
    }

    // 4. Query gym_owners
    const orOwner = [`userId.eq.${userId}`, `createdBy.eq.${userId}`];
    if (cleanEmail) {
      orOwner.push(`ownerEmail.eq.${cleanEmail}`);
    }

    const { data: ownerRows } = await supabase
      .from('gym_owners')
      .select('gymOwnerId, gymId, is_deleted')
      .or(orOwner.join(','))
      .eq('is_deleted', false);

    if (ownerRows && ownerRows.length > 0) {
      const match = ownerRows.find((o: any) => o.gymId === selectedGymId);
      if (match) {
        return { isAuthorized: true, userGymId: selectedGymId, role: 'owner', reason: 'MATCH' };
      }
      return {
        isAuthorized: false,
        userGymId: ownerRows[0].gymId,
        role: 'owner',
        reason: 'DIFFERENT_GYM',
      };
    }

    // If role in users table is explicitly gym-bound, but no membership in selected gym was found:
    if (['customer', 'trainer', 'owner'].includes(cleanRole)) {
      return {
        isAuthorized: false,
        role,
        reason: 'NO_MEMBERSHIP_FOUND',
      };
    }

    // If user has no gym-bound records and no gym-bound role (e.g. individual)
    return { isAuthorized: true, role, reason: 'NOT_GYM_BOUND' };
  } catch (err) {
    console.error('[tenantHelper] verifyUserGymMembership unexpected error:', err);
    return { isAuthorized: false, reason: 'ERROR' };
  }
}
