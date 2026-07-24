import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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

  const fetchProfile = useCallback(async (authUserId: string | null) => {
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
      const { data, error } = await supabase
        .from('users')
        .select('userId, name, email, phone, address, role')
        .eq('userId', authUserId)
        .maybeSingle();

      if (error) {
        console.error('[UserContext] Error fetching profile:', error);
      }

      if (data) {
        setUserId(data.userId);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone);
        setAddress(data.address);
        setRole(data.role);
      } else {
        console.warn('[UserContext] No user profile record found in DB for auth ID:', authUserId);
      }
    } catch (err) {
      console.error('[UserContext] Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUserContext = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetchProfile(session?.user?.id || null);
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[UserContext] Auth state change event:', event);
      if (session?.user?.id) {
        fetchProfile(session.user.id);
      } else {
        fetchProfile(null);
      }
    });

    return () => {
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
