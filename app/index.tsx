import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { getSelectedGym } from '@/helpers/tenantHelper';

export default function Index() {
  const { role, loading } = useUser();
  const [checkingGym, setCheckingGym] = useState(true);
  const [hasSelectedGym, setHasSelectedGym] = useState(false);

  useEffect(() => {
    if (!loading && !role) {
      const checkGym = async () => {
        const gym = await getSelectedGym();
        setHasSelectedGym(!!gym);
        setCheckingGym(false);
      };
      checkGym();
    } else if (!loading && role) {
      setCheckingGym(false);
    }
  }, [loading, role]);

  if (loading || checkingGym) {
    return (
      <View style={{ flex: 1, backgroundColor: '#09090B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D4FF00" />
      </View>
    );
  }

  if (role) {
    if (role === 'superadmin') {
      return <Redirect href="/(superadmin)/dashboard" />;
    } else if (role === 'owner') {
      return <Redirect href="/(owner)/dashboard" />;
    } else if (role === 'doctor') {
      return <Redirect href="/(doctor)/patients" />;
    } else {
      return <Redirect href="/(customer)/home" />;
    }
  }

  if (hasSelectedGym) {
    return <Redirect href="/auth/otp-auth" />;
  }

  return <Redirect href="/auth/account-type" />;
}
