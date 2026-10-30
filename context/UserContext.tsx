import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserAndRoleProfile, UserProfile } from '@/helpers/user/userProfileHelper';
import { unregisterPushToken } from '@/lib/services/notificationService';
import {
  getFallbackAuthUser,
  saveFallbackAuthUser,
  clearFallbackAuthUser,
  FallbackAuthUser
} from '@/helpers/auth/fallbackAuthHelper';

type UserContextType = UserProfile & {
  loading: boolean;
  refreshUserContext: () => Promise<void>;
  setFallbackUserSession: (user: FallbackAuthUser | null) => Promise<void>;
};

const UserContext = createContext<UserContextType>({
  userId: null,
  gymOwnerId: null,
  gymId: null,
  customerId: null,
  trainerId: null,
  globalTrainerId: null,
  doctorId: null,
  dieticianId: null,
  name: null,
  email: null,
  phone: null,
  gender: null,
  dob: null,
  address: null,
  country: null,
  state: null,
  city: null,
  pincode: null,
  role: null,
  status: 'active',
  isEmailVerified: false,
  isPhoneVerified: false,
  profilePhoto: null,
  profilePic: null,
  createdAt: null,
  updatedAt: null,
  loading: true,
  refreshUserContext: async () => { },
  setFallbackUserSession: async () => { },
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [fallbackUser, setFallbackUser] = useState<FallbackAuthUser | null>(null);
  const initialCheckCompleted = useRef(false);

  // 1. Manage Auth Session
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(currentSession);
          if (!currentSession) {
            const fb = await getFallbackAuthUser();
            if (fb && isMounted) {
              setFallbackUser(fb);
            }
          }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!initialCheckCompleted.current) return;
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        setFallbackUser(null);
        await clearFallbackAuthUser();
        unregisterPushToken().catch(() => {});
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setFallbackUserSession = async (user: FallbackAuthUser | null) => {
    if (user) {
      setFallbackUser(user);
      await saveFallbackAuthUser(user);
      await refetch();
    } else {
      setFallbackUser(null);
      await clearFallbackAuthUser();
      await refetch();
    }
  };

  const authUserId = session?.user?.id || fallbackUser?.id || null;
  const authEmail = session?.user?.email || fallbackUser?.email || null;

  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ['userProfile', authUserId],
    queryFn: async () => {
      if (!authUserId) return null;
      return await fetchUserAndRoleProfile(authUserId, authEmail);
    },
    enabled: !!authUserId && !sessionLoading,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const loading = sessionLoading || (!!authUserId && profileLoading);

  const refreshUserContext = async () => {
    await refetch();
  };

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
      gender: profile?.gender || null,
      dob: profile?.dob || null,
      address: profile?.address || null,
      country: profile?.country || null,
      state: profile?.state || null,
      city: profile?.city || null,
      pincode: profile?.pincode || null,
      role: profile?.role || null,
      status: profile?.status || 'active',
      isEmailVerified: profile?.isEmailVerified ?? false,
      isPhoneVerified: profile?.isPhoneVerified ?? false,
      profilePhoto: profile?.profilePhoto || null,
      profilePic: profile?.profilePic || null,
      createdAt: profile?.createdAt || null,
      updatedAt: profile?.updatedAt || null,

      gymOwnerId: profile?.gymOwnerId || null,
      gymId: profile?.gymId || null,
      customerId: profile?.customerId || null,
      trainerId: profile?.trainerId || null,
      globalTrainerId: profile?.globalTrainerId || null,
      doctorId: profile?.doctorId || null,
      dieticianId: profile?.dieticianId || null,

      isGymSuspended: profile?.isGymSuspended || false,

      loading,
      refreshUserContext,
      setFallbackUserSession,
    }),
    [profile, loading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
