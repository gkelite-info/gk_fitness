import { supabase, supabaseAdminAuth } from '@/lib/supabase';

export interface RollbackTarget {
  userId?: string | null;
  authUserId?: string | null;
  email?: string | null;
  phone?: string | null;
  createdTables?: ('gym_trainer_schedules' | 'gym_trainers' | 'users' | 'supabase_auth' | string)[];
}

export async function rollbackRegistrationData(target: RollbackTarget) {
  const {
    userId,
    authUserId,
    email,
    phone,
    createdTables = ['gym_trainer_schedules', 'gym_trainers', 'users', 'supabase_auth'],
  } = target;

  const targetId = userId || authUserId;
  console.log(`[RegistrationRollback] Starting cleanup rollback for targetId: ${targetId || 'N/A'}, email: ${email || 'N/A'}, phone: ${phone || 'N/A'}...`);

  const cleanupStatus: Record<string, boolean> = {};

  if (createdTables.includes('gym_trainer_schedules') && targetId) {
    try {
      const { error } = await supabase
        .from('gym_trainer_schedules')
        .delete()
        .eq('gymTrainerId', targetId);
      if (error) {
        console.warn('[RegistrationRollback] Failed to delete gym_trainer_schedules:', error.message);
      } else {
        cleanupStatus['gym_trainer_schedules'] = true;
      }
    } catch (e: any) {
      console.warn('[RegistrationRollback] Exception deleting gym_trainer_schedules:', e?.message || e);
    }
  }

  if (createdTables.includes('gym_trainers') && targetId) {
    try {
      const { error } = await supabase
        .from('gym_trainers')
        .delete()
        .or(`gymTrainerId.eq.${targetId},userId.eq.${targetId}`);
      if (error) {
        console.warn('[RegistrationRollback] Failed to delete gym_trainers:', error.message);
      } else {
        cleanupStatus['gym_trainers'] = true;
      }
    } catch (e: any) {
      console.warn('[RegistrationRollback] Exception deleting gym_trainers:', e?.message || e);
    }
  }

  if (createdTables.includes('users')) {
    try {
      if (targetId) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('userId', targetId);
        if (error) {
          console.warn('[RegistrationRollback] Failed to delete users row by userId:', error.message);
        } else {
          cleanupStatus['users'] = true;
        }
      } else if (email) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('email', email);
        if (error) {
          console.warn('[RegistrationRollback] Failed to delete users row by email:', error.message);
        } else {
          cleanupStatus['users'] = true;
        }
      }
    } catch (e: any) {
      console.warn('[RegistrationRollback] Exception deleting users row:', e?.message || e);
    }
  }

  if (createdTables.includes('supabase_auth') && targetId) {
    try {
      const { error: rpcErr } = await supabase.rpc('delete_auth_user', { p_user_id: targetId });
      if (!rpcErr) {
        cleanupStatus['supabase_auth'] = true;
      } else {
        try {
          const { error: adminErr } = await supabaseAdminAuth.auth.admin.deleteUser(targetId);
          if (!adminErr) {
            cleanupStatus['supabase_auth'] = true;
          }
        } catch (e) {
          // Ignore if admin key is restricted on client
        }
      }
    } catch (e: any) {
      console.warn('[RegistrationRollback] Exception cleaning up auth user:', e?.message || e);
    }
  }

  console.log('[RegistrationRollback] Cleanup finished. Summary:', cleanupStatus);
  return cleanupStatus;
}


export function parseRegistrationError(error: any): {
  isEmailDuplicate: boolean;
  isPhoneDuplicate: boolean;
  userFacingMessage: string;
} {
  const errStr = (
    (typeof error === 'string' ? error : '') +
    ' ' +
    (error?.message || '') +
    ' ' +
    (error?.details || '') +
    ' ' +
    (error?.hint || '') +
    ' ' +
    (JSON.stringify(error) || '')
  ).toLowerCase();

  const isPhoneDuplicate =
    errStr.includes('users_phone') ||
    errStr.includes('phone_key') ||
    errStr.includes('users_phone_key3') ||
    errStr.includes('phone number already registered') ||
    (errStr.includes('duplicate key') && errStr.includes('phone'));

  const isEmailDuplicate =
    errStr.includes('users_email') ||
    errStr.includes('email_key') ||
    errStr.includes('already registered') ||
    errStr.includes('user already exists') ||
    errStr.includes('email already in use') ||
    (errStr.includes('duplicate key') && errStr.includes('email'));

  let userFacingMessage = 'Registration failed. Please check details and try again.';
  if (isEmailDuplicate && isPhoneDuplicate) {
    userFacingMessage = 'email already exists, mobile already exists';
  } else if (isEmailDuplicate) {
    userFacingMessage = 'email already exists';
  } else if (isPhoneDuplicate) {
    userFacingMessage = 'mobile already exists';
  } else if (error?.message) {
    userFacingMessage = error.message;
  }

  return {
    isEmailDuplicate,
    isPhoneDuplicate,
    userFacingMessage,
  };
}
