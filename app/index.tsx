import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { getSelectedGym, verifyUserGymMembership, clearSelectedGym } from '@/helpers/tenantHelper';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { role, loading, userId, email } = useUser();
  const [checkingGym, setCheckingGym] = useState(true);
  const [hasSelectedGym, setHasSelectedGym] = useState(false);
  const [tenantAuthorized, setTenantAuthorized] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndGym() {
      if (loading) return;

      if (!role) {
        const gym = await getSelectedGym();
        if (isMounted) {
          setHasSelectedGym(!!gym);
          setCheckingGym(false);
        }
      } else {
        const normalizedRole = role.trim().toLowerCase();
        if (['customer', 'trainer', 'owner'].includes(normalizedRole)) {
          const gym = await getSelectedGym();
          if (gym?.gymId && userId) {
            const authResult = await verifyUserGymMembership(userId, email, gym.gymId);
            if (!authResult.isAuthorized) {
              console.warn('[Index] Mismatched/stale session detected. Signing out.');
              await supabase.auth.signOut();
              await clearSelectedGym();
              if (isMounted) {
                setTenantAuthorized(false);
                setHasSelectedGym(false);
                setCheckingGym(false);
              }
              return;
            }
          }
        }
        if (isMounted) {
          setCheckingGym(false);
        }
      }
    }

    checkAuthAndGym();

    return () => {
      isMounted = false;
    };
  }, [loading, role, userId, email]);

  if (loading || checkingGym) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  if (role && tenantAuthorized) {
    const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');
    if (normalizedRole === 'superadmin') {
      return <Redirect href="/(superadmin)/dashboard" />;
    } else if (normalizedRole === 'owner') {
      return <Redirect href="/(owner)/dashboard" />;
    } else if (normalizedRole === 'doctor') {
      return <Redirect href="/(doctor)/patients" />;
    } else if (normalizedRole === 'trainer' || normalizedRole === 'gymtrainer' || normalizedRole === 'globaltrainer') {
      return <Redirect href={"/(trainer)/home" as any} />;
    } else if (normalizedRole === 'individual' || normalizedRole === 'customer') {
      return <Redirect href="/(customer)/home" />;
    } else {
      return <Redirect href="/auth/account-type" />;
    }
  }

  if (hasSelectedGym) {
    return <Redirect href="/auth/otp-auth" />;
  }

  return <Redirect href="/auth/account-type" />;
}
