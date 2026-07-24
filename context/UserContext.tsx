import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { createUser } from '@/helpers/otpHelper';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

type UserContextType = {
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: string | null;
  loading: boolean;
  refreshUserContext: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  name: null,
  email: null,
  phone: null,
  address: null,
  role: null,
  loading: true,
  refreshUserContext: async () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Use a ref to track whether the initial auth check has finished
  const initialCheckCompleted = useRef(false);

  const fetchProfile = useCallback(async (authUserId: string | null, authEmail?: string | null) => {
    if (!authUserId) {
      setUserId(null);
      setName(null);
      setEmail(null);
      setPhone(null);
      setAddress(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      let { data, error } = await supabase
        .from('users')
        .select('userId, name, email, phone, address, role')
        .eq('userId', authUserId)
        .maybeSingle();

      // 2. Fallback: try by email if userId match failed
      if (!data && authEmail) {
        const emailRes = await supabase
          .from('users')
          .select('userId, name, email, phone, address, role')
          .eq('email', authEmail)
          .maybeSingle();
        data = emailRes.data;
      }

      // 3. Fallback: If profile still missing, auto-create from Supabase Auth metadata
      if (!data && authUserId) {
        // console.log('[UserContext] Profile missing in DB. Attempting auto-creation from auth session metadata...');
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (authUser && authUser.id === authUserId) {
          const metadata = authUser.user_metadata || {};
          const userPhone = metadata.phone || '';

          try {
            const createdProfile = await createUser({
              userId: authUserId,
              name: metadata.name || 'User',
              email: authUser.email || authEmail || '',
              phone: userPhone,
              address: metadata.address || '',
              role: metadata.role || 'customer',
            });

            if (createdProfile) {
              // console.log('[UserContext] Auto-creation of user profile succeeded:', createdProfile);
              data = createdProfile;
            }
          } catch (createError) {
            console.error('[UserContext] Auto-creation of user profile failed:', createError);
          }
        }
      }

      if (data) {
        // console.log('[UserContext] Setting user context with profile role:', data.role);
        setUserId(data.userId || authUserId);
        setName(data.name || 'User');
        setEmail(data.email || authEmail || null);
        setPhone(data.phone || null);
        setAddress(data.address || null);
        setRole(data.role || 'customer');
      } else {
        console.warn('[UserContext] Active session found but profile missing in DB and auto-creation failed. Fallback to superadmin.');
        setUserId(authUserId);
        setEmail(authEmail || null);
        setRole('superadmin');
      }
    } catch (err) {
      console.error('[UserContext] Failed to fetch user profile:', err);
      setUserId(authUserId);
      setRole('superadmin');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserContext = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetchProfile(session?.user?.id || null, session?.user?.email || null);
  }, [fetchProfile]);

  useEffect(() => {
    const handleUrl = async (url: string) => {
      try {
        const hash = url.split('#')[1];
        if (!hash) return;

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            router.replace('/auth/reset-password');
          }
        }
      } catch (e) {
        console.error('[UserContext] Error parsing deep link:', e);
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session?.user?.id) {
            await fetchProfile(session.user.id, session.user.email || null);
          } else {
            await fetchProfile(null, null);
          }
        }
      } catch (err) {
        console.error('[UserContext] Error during initial auth check:', err);
        if (isMounted) {
          setLoading(false);
        }
      } finally {
        initialCheckCompleted.current = true;
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      // If the initial getSession is still executing, we ignore onAuthStateChange events to prevent race conditions
      if (!initialCheckCompleted.current) {
        return;
      }

      if (session?.user?.id) {
        fetchProfile(session.user.id, session.user.email || null);
      } else {
        fetchProfile(null, null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = useMemo(
    () => ({
      userId,
      name,
      email,
      phone,
      address,
      role,
      loading,
      refreshUserContext,
    }),
    [userId, name, email, phone, address, role, loading, refreshUserContext]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
