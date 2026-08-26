import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GymRegistrationForm } from '@/components/forms/GymRegistrationForm';

export default function RegisterGymScreen() {
  const params = useLocalSearchParams<{ editGymId?: string; gymLeadId?: string }>();

  return (
    <GymRegistrationForm
      editGymId={params.editGymId}
      gymLeadId={params.gymLeadId}
    />
  );
}
