import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserAndRoleProfile, UserProfile } from '@/helpers/user/userProfileHelper';

type UserContextType = UserProfile & {
  loading: boolean;
  refreshUserContext: () => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  gymOwnerId: null,
  gymId: null,
  customerId: null,
  trainerId: null,
  doctorId: null,
  dieticianId: null,
  name: null,
  email: null,
  phone: null,
  address: null,
  role: null,
  profilePhoto: null,
  loading: true,
  refreshUserContext: async () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const initialCheckCompleted = useRef(false);

  // 1. Manage Auth Session
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(currentSession);
        }
      } catch (err) {
        console.error('[UserContext] Error during initial auth check:', err);
      } finally {
        if (isMounted) {
          setSessionLoading(false);
          initialCheckCompleted.current = true;
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!initialCheckCompleted.current) return;
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch Profile using React Query
  const authUserId = session?.user?.id || null;
  const authEmail = session?.user?.email || null;

  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ['userProfile', authUserId],
    queryFn: async () => {
      if (!authUserId) return null;
      return await fetchUserAndRoleProfile(authUserId, authEmail);
    },
    enabled: !!authUserId && !sessionLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const loading = sessionLoading || (!!authUserId && profileLoading);

  const refreshUserContext = async () => {
    await refetch();
  };

  // 3. Handle Deep Links (Password Reset)
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

  const value = useMemo(
    () => ({
      userId: profile?.userId || null,
      name: profile?.name || null,
      email: profile?.email || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      role: profile?.role || null,
      profilePhoto: profile?.profilePhoto || null,

      gymOwnerId: profile?.gymOwnerId || null,
      gymId: profile?.gymId || null,
      customerId: profile?.customerId || null,
      trainerId: profile?.trainerId || null,
      doctorId: profile?.doctorId || null,
      dieticianId: profile?.dieticianId || null,

      isGymSuspended: profile?.isGymSuspended || false,

      loading,
      refreshUserContext,
    }),
    [profile, loading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
