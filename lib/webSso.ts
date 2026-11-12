import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface WebSsoUrlOptions {
  returnTo: string;
  action: string;
  planId?: string | null;
  planName?: string | null;
  trainerId?: string | null;
  trainerName?: string | null;
  amount?: number | string | null;
  userId?: string | null;
  role?: string | null;
  customerId?: string | null;
  gymId?: string | null;
  email?: string | null;
  phone?: string | null;
  session?: Session | null;
}

/**
 * Safely resolves the current Supabase Auth session (refreshing if near expiry)
 * without throwing when the user is signed in via fallback session state.
 */
export async function resolveActiveSupabaseSession(logTag = 'WebSSO'): Promise<Session | null> {
  try {
    let session = (await supabase.auth.getSession())?.data?.session ?? null;
    if (
      session?.refresh_token &&
      (!session.access_token || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000))
    ) {
      const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshData?.session) {
        session = refreshData.session;
      } else if (refreshErr) {
        console.warn(`[${logTag}] Token refresh warning:`, refreshErr.message);
      }
    }
    return session;
  } catch (err) {
    console.warn(`[${logTag}] Session read warning:`, err);
    return null;
  }
}

/**
 * Builds the GK GymLife web portal SSO URL, attaching Supabase tokens when
 * present and relying on authenticated UserContext identifiers for fallback sessions.
 */
export function buildWebSsoUrl({
  returnTo,
  action,
  planId,
  planName,
  trainerId,
  trainerName,
  amount,
  userId,
  role,
  customerId,
  gymId,
  email,
  phone,
  session,
}: WebSsoUrlOptions): string {
  const webHost = 'https://www.gkgymlife.com';
  const baseUrl = `${webHost}/api/auth/sso`;
  const params = new URLSearchParams();

  params.append('returnTo', returnTo);
  params.append('action', action);
  if (planId) params.append('planId', String(planId));
  if (planName) params.append('planName', planName);
  if (trainerId) params.append('trainerId', String(trainerId));
  if (trainerName) params.append('trainerName', trainerName);
  if (amount !== undefined && amount !== null && amount !== '') params.append('amount', String(amount));

  if (session?.access_token) {
    params.append('access_token', session.access_token);
    if (session.refresh_token) {
      params.append('refresh_token', session.refresh_token);
    }
  } else {
    const resolvedUserId = userId || session?.user?.id;
    const emailVal = session?.user?.email || email;
    if (resolvedUserId) params.append('userId', resolvedUserId);
    if (emailVal) params.append('email', emailVal);
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return `${baseUrl}${queryString}`;
}

