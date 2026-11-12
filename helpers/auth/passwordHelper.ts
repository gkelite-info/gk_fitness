import bcrypt from 'bcryptjs';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { getFallbackAuthUser } from '@/helpers/auth/fallbackAuthHelper';

// Provide cryptographically secure PRNG for React Native / Hermes where global WebCrypto is not present
try {
  bcrypt.setRandomFallback((len: number): number[] => {
    try {
      if (Crypto && typeof Crypto.getRandomBytes === 'function') {
        const bytes = Crypto.getRandomBytes(len);
        return Array.from(bytes);
      }
    } catch (cryptoErr) {
      console.warn('[passwordHelper] Crypto.getRandomBytes failed, using fallback:', cryptoErr);
    }

    const arr: number[] = [];
    for (let i = 0; i < len; i++) {
      arr.push(Math.floor(Math.random() * 256));
    }
    return arr;
  });
} catch (e) {
  console.warn('[passwordHelper] Failed to register bcrypt random fallback:', e);
}

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds ($2b$10$...).
 */
export async function hashPassword(password: string): Promise<string> {
  const cleanPassword = password.trim();

  return new Promise((resolve, reject) => {
    try {
      const salt = bcrypt.genSaltSync(BCRYPT_SALT_ROUNDS);
      const hash = bcrypt.hashSync(cleanPassword, salt);
      resolve(hash);
    } catch (err) {
      bcrypt.hash(cleanPassword, BCRYPT_SALT_ROUNDS, (asyncErr, asyncHash) => {
        if (asyncErr || !asyncHash) {
          reject(err || asyncErr);
        } else {
          resolve(asyncHash);
        }
      });
    }
  });
}

/**
 * Hashes a plaintext password using SHA-1 (40 hex characters).
 */
export async function hashPasswordSha1(password: string): Promise<string> {
  const cleanPassword = password.trim();
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, cleanPassword);
}

/**
 * Verifies a plaintext password against a stored hash.
 * Supports:
 *  1. Bcrypt ($2a$, $2b$, $2y$)
 *  2. SHA-1 (40 hex characters)
 *  3. Legacy SHA-256 (64 hex characters)
 *  4. MD5 fallback (32 hex characters)
 *  5. Plaintext fallback
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;

  const rawPassword = password;
  const trimmedPassword = password.trim();
  const cleanStored = storedHash.trim();
  const lowerStored = cleanStored.toLowerCase();

  // 1. Bcrypt hash check ($2a$, $2b$, $2y$)
  if (
    cleanStored.startsWith('$2a$') ||
    cleanStored.startsWith('$2b$') ||
    cleanStored.startsWith('$2y$')
  ) {
    try {
      // 1a. Plaintext directly
      if (bcrypt.compareSync(rawPassword, cleanStored) || bcrypt.compareSync(trimmedPassword, cleanStored)) {
        return true;
      }

      // 1b. Bcrypt of SHA-1 hash (lowercase and uppercase)
      const sha1Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, rawPassword);
      const sha1Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, trimmedPassword);
      if (
        bcrypt.compareSync(sha1Raw, cleanStored) ||
        bcrypt.compareSync(sha1Trimmed, cleanStored) ||
        bcrypt.compareSync(sha1Raw.toUpperCase(), cleanStored) ||
        bcrypt.compareSync(sha1Trimmed.toUpperCase(), cleanStored)
      ) {
        return true;
      }

      // 1c. Bcrypt of SHA-256 hash (lowercase and uppercase)
      const sha256Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawPassword);
      const sha256Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, trimmedPassword);
      if (
        bcrypt.compareSync(sha256Raw, cleanStored) ||
        bcrypt.compareSync(sha256Trimmed, cleanStored) ||
        bcrypt.compareSync(sha256Raw.toUpperCase(), cleanStored) ||
        bcrypt.compareSync(sha256Trimmed.toUpperCase(), cleanStored)
      ) {
        return true;
      }

      // 1d. Bcrypt of MD5 hash
      const md5Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, rawPassword);
      const md5Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, trimmedPassword);
      if (
        bcrypt.compareSync(md5Raw, cleanStored) ||
        bcrypt.compareSync(md5Trimmed, cleanStored)
      ) {
        return true;
      }
    } catch (bcryptErr) {
      console.warn('[passwordHelper] Bcrypt comparison error:', bcryptErr);
    }
  }

  // 2. SHA-1 hash check (40 hex chars)
  try {
    const sha1Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, rawPassword);
    const sha1Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, trimmedPassword);
    if (
      lowerStored === sha1Raw.toLowerCase() ||
      lowerStored === sha1Trimmed.toLowerCase()
    ) {
      return true;
    }
  } catch (sha1Err) {
    console.warn('[passwordHelper] SHA-1 check error:', sha1Err);
  }

  // 3. Legacy SHA-256 hash fallback (64 hex chars)
  try {
    const sha256Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawPassword);
    const sha256Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, trimmedPassword);
    if (
      lowerStored === sha256Raw.toLowerCase() ||
      lowerStored === sha256Trimmed.toLowerCase()
    ) {
      return true;
    }
  } catch (shaErr) {
    console.warn('[passwordHelper] SHA-256 fallback error:', shaErr);
  }

  // 4. MD5 fallback (32 hex chars)
  try {
    const md5Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, rawPassword);
    const md5Trimmed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, trimmedPassword);
    if (
      lowerStored === md5Raw.toLowerCase() ||
      lowerStored === md5Trimmed.toLowerCase()
    ) {
      return true;
    }
  } catch (md5Err) {
    // Ignore MD5 error
  }

  // 5. Plaintext fallback (if legacy unhashed record existed)
  if (cleanStored === rawPassword || cleanStored === trimmedPassword) {
    return true;
  }

  return false;
}

export interface ChangePasswordParams {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  currentPassword: string;
  newPassword: string;
  logTag?: string;
}

export interface ChangePasswordResult {
  dbUpdated: boolean;
  authUpdated: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
  name?: string | null;
}

type DbUserRow = {
  userId: string;
  name?: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  password?: string | null;
};

async function resolveDbUser(
  targetUserId: string | null,
  targetEmail: string | null,
  phone: string | null | undefined,
  tag: string
): Promise<{ dbUser: DbUserRow | null; userId: string | null; email: string | null }> {
  let resolvedId = targetUserId;
  let resolvedEmail = targetEmail;
  let dbUser: DbUserRow | null = null;

  if (resolvedId) {
    const { data, error } = await supabase
      .from('users')
      .select('userId, name, email, phone, role, password')
      .eq('userId', resolvedId)
      .maybeSingle();

    if (error) {
      console.warn(`[${tag}] Error fetching user by userId:`, error.message);
    } else if (data) {
      dbUser = data;
      if (!resolvedEmail && data.email) resolvedEmail = data.email.trim().toLowerCase();
    }
  }

  if (!dbUser && resolvedEmail) {
    const { data, error } = await supabase
      .from('users')
      .select('userId, name, email, phone, role, password')
      .ilike('email', resolvedEmail)
      .maybeSingle();

    if (error) {
      console.warn(`[${tag}] Error fetching user by email:`, error.message);
    } else if (data) {
      dbUser = data;
      if (!resolvedId && data.userId) resolvedId = data.userId;
    }
  }

  if (!dbUser && phone) {
    const last10 = phone.replace(/[^0-9]/g, '').slice(-10);
    if (last10) {
      const { data, error } = await supabase
        .from('users')
        .select('userId, name, email, phone, role, password')
        .or(`phone.ilike.%${last10}%,email.ilike.%${last10}%`)
        .maybeSingle();

      if (error) {
        console.warn(`[${tag}] Error fetching user by phone:`, error.message);
      } else if (data) {
        dbUser = data;
        if (!resolvedId && data.userId) resolvedId = data.userId;
        if (!resolvedEmail && data.email) resolvedEmail = data.email.trim().toLowerCase();
      }
    }
  }

  return { dbUser, userId: resolvedId, email: resolvedEmail };
}

/**
 * Verifies current password, establishes an active Supabase Auth session where possible,
 * updates Supabase Auth + public.users.password (using bcrypt hashPassword matching signup.tsx),
 * and strictly verifies that BOTH stores were genuinely updated before succeeding.
 */
export async function executeChangePassword(params: ChangePasswordParams): Promise<ChangePasswordResult> {
  const { userId, email, phone, role, currentPassword, newPassword, logTag = 'ChangePassword' } = params;

  let targetUserId = userId || null;
  let targetEmail = email ? email.trim().toLowerCase() : null;

  try {
    const { data: authUserData, error: authUserErr } = await supabase.auth.getUser();
    if (authUserData?.user) {
      if (!targetUserId) targetUserId = authUserData.user.id;
      if (!targetEmail && authUserData.user.email) targetEmail = authUserData.user.email.trim().toLowerCase();
    } else if (authUserErr) {
    }
  } catch (err) {
    console.warn(`[${logTag}] Exception reading Supabase auth user:`, err);
  }

  if (!targetUserId || !targetEmail) {
    try {
      const fallbackUser = await getFallbackAuthUser();
      if (fallbackUser) {
        if (!targetUserId) targetUserId = fallbackUser.id;
        if (!targetEmail && fallbackUser.email) targetEmail = fallbackUser.email.trim().toLowerCase();
      }
    } catch (fbErr) {
      console.warn(`[${logTag}] Error reading fallback auth user:`, fbErr);
    }
  }

  const resolved = await resolveDbUser(targetUserId, targetEmail, phone, logTag);
  const dbUser = resolved.dbUser;
  targetUserId = resolved.userId;
  targetEmail = resolved.email;

  if (!targetUserId && !targetEmail && !dbUser) {
    throw new Error('User information not found. Please log in again.');
  }

  let isVerified = false;
  let verificationSource = '';

  if (dbUser?.password) {
    const isDbMatch = await verifyPassword(currentPassword, dbUser.password);
    if (isDbMatch) {
      isVerified = true;
      verificationSource = 'database (users.password)';
    }
  }

  const authEmailToUse = (targetEmail || dbUser?.email || email)?.trim().toLowerCase() || null;
  let supabaseSessionEstablished = false;
  let lastAuthSignInError = '';

  const passwordsToTry: string[] = [currentPassword, currentPassword.trim()];
  try {
    const sha1Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, currentPassword);
    const sha1Trim = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, currentPassword.trim());
    const sha256Raw = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, currentPassword);
    const sha256Trim = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, currentPassword.trim());
    passwordsToTry.push(sha1Raw, sha1Trim, sha1Raw.toUpperCase(), sha1Trim.toUpperCase(), sha256Raw, sha256Trim);
  } catch { }

  if (authEmailToUse) {
    for (const pwd of passwordsToTry) {
      try {
        const res = await supabase.auth.signInWithPassword({ email: authEmailToUse, password: pwd });
        if (!res.error && res.data?.session) {
          isVerified = true;
          supabaseSessionEstablished = true;
          verificationSource = verificationSource ? `${verificationSource} + supabase_auth` : 'supabase_auth';
          break;
        }
        if (res.error) {
          lastAuthSignInError = res.error.message;
          // If email is unconfirmed or account doesn't allow password sign-in, don't loop futilely
          if (res.error.message?.toLowerCase().includes('email not confirmed')) {
            console.warn(`[${logTag}] Supabase Auth sign-in rejected:`, res.error.message);
            break;
          }
        }
      } catch (e: any) {
        lastAuthSignInError = e?.message || lastAuthSignInError;
      }
    }
    if (!supabaseSessionEstablished && lastAuthSignInError) {
      console.warn(`[${logTag}] Could not establish Supabase Auth session:`, lastAuthSignInError);
    }
  }

  if (!isVerified) {
    throw new Error('Current password is incorrect.');
  }

  // 2. Hash new password using bcrypt (identical to app/auth/signup.tsx)
  const newHashedPassword = await hashPassword(newPassword);
  const finalUserId = dbUser?.userId || targetUserId;
  const finalEmail = authEmailToUse;

  let authUpdated = false;
  let dbUpdated = false;
  let authUpdateErrorMsg = '';
  let dbUpdateErrorMsg = '';
  const isEmailUnconfirmed = lastAuthSignInError.toLowerCase().includes('email not confirmed');

  // 3A. Update Supabase Auth if an active session is established
  if (supabaseSessionEstablished) {
    try {
      const { data: authUpdateData, error: authUpdateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!authUpdateErr && authUpdateData?.user) {
        authUpdated = true;
      } else {
        authUpdateErrorMsg = authUpdateErr?.message || 'Supabase Auth updateUser returned no user';
        console.warn(`[${logTag}] Supabase Auth updateUser failed:`, authUpdateErrorMsg);
      }
    } catch (e: any) {
      authUpdateErrorMsg = e?.message || 'Exception calling supabase.auth.updateUser';
    }
  }

  // 3B. Attempt direct public.users.password update & verify actual stored hash
  if (finalUserId) {
    const { data: updatedRows, error: updateErr } = await supabase
      .from('users')
      .update({ password: newHashedPassword, updatedAt: new Date().toISOString() })
      .eq('userId', finalUserId)
      .select('userId, password');

    if (!updateErr && updatedRows && updatedRows.length > 0 && updatedRows[0]?.password) {
      dbUpdated = await verifyPassword(newPassword, updatedRows[0].password);
    } else {
      dbUpdateErrorMsg = updateErr?.message || 'Direct users update matched 0 rows (RLS)';
      console.warn(`[${logTag}] Direct users table update notice:`, dbUpdateErrorMsg);
    }
  }

  // 3C. Server-side SECURITY DEFINER RPC fallback when no active session exists or RLS blocked client update
  if (((!authUpdated && !isEmailUnconfirmed) || !dbUpdated) && finalUserId) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('change_user_password', {
      p_user_id: finalUserId,
      p_current_password: currentPassword.trim(),
      p_new_password: newPassword,
      p_new_hashed_password: newHashedPassword,
    });

    if (rpcErr) {
      console.warn(`[${logTag}] change_user_password RPC notice:`, rpcErr.code, rpcErr.message);
      const rpcDetail = `${rpcErr.code ? `${rpcErr.code}: ` : ''}${rpcErr.message}`;
      dbUpdateErrorMsg = dbUpdateErrorMsg ? `${dbUpdateErrorMsg}; RPC: ${rpcDetail}` : rpcDetail;
      authUpdateErrorMsg = authUpdateErrorMsg ? `${authUpdateErrorMsg}; RPC: ${rpcDetail}` : rpcDetail;
    } else if (rpcData) {
      if (rpcData.auth_updated === true) authUpdated = true;
      if (rpcData.db_updated === true) dbUpdated = true;
    }
  }

  // 4. Independent verification against public.users (never trust optimistic booleans)
  if (finalUserId) {
    try {
      const { data: verifyRow } = await supabase
        .from('users')
        .select('userId, password')
        .eq('userId', finalUserId)
        .maybeSingle();

      if (verifyRow?.password) {
        const verifiedInDb = await verifyPassword(newPassword, verifyRow.password);
        dbUpdated = verifiedInDb;
      }
    } catch (verifyErr) {
      console.warn(`[${logTag}] Notice verifying updated DB row:`, verifyErr);
    }
  }

  // 5. Enforce verified update:
  //    - If user's email is unconfirmed in Supabase Auth ("Email not confirmed"), updating users.password
  //      suffices because fallback sign-in authenticates against public.users.password.
  //    - Otherwise, require BOTH Supabase Auth and users.password to be updated.
  const requiresAuthUpdate = !isEmailUnconfirmed;
  if (!dbUpdated || (requiresAuthUpdate && !authUpdated)) {
    const missingParts: string[] = [];
    if (requiresAuthUpdate && !authUpdated) {
      missingParts.push(`Supabase Auth (${lastAuthSignInError || authUpdateErrorMsg || 'Auth session missing'})`);
    }
    if (!dbUpdated) {
      missingParts.push(`users.password column (${dbUpdateErrorMsg || 'blocked by RLS / 0 rows updated'})`);
    }
    throw new Error(`Password update incomplete: failed to update ${missingParts.join(' and ')}.`);
  }

  return {
    dbUpdated,
    authUpdated,
    userId: finalUserId,
    email: finalEmail,
    role: role || dbUser?.role || null,
    name: dbUser?.name || null,
  };
}
