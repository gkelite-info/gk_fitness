import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUser } from '@/context/UserContext';
import { toast } from '@/lib/toast';

export type OnboardingData = {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  gymId: string;
  height: string;
  weight: string;
  primaryGoal: string;
  targetWeight: string;
  workoutLocation: string;
  workoutDays: string[];
  preferWorkoutTime: string;
  dietType: string;
  mealsPerDay: number | null;
  foodAllergies: string[];
  dailyWaterGoal: number;
};

type OnboardingContextType = {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  loading: boolean;
};

const initialData: OnboardingData = {
  fullName: '',
  gender: '',
  dateOfBirth: '',
  gymId: '',
  height: '',
  weight: '',
  primaryGoal: '',
  targetWeight: '',
  workoutLocation: '',
  workoutDays: [],
  preferWorkoutTime: '',
  dietType: '',
  mealsPerDay: null,
  foodAllergies: [],
  dailyWaterGoal: 3.0,
};

const OnboardingContext = createContext<OnboardingContextType>({
  data: initialData,
  updateData: () => {},
  loading: true,
});

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useUser();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loading, setLoading] = useState(true);

  const { data: profile, isLoading } = useCustomerProfile(userId);

  useEffect(() => {
    if (profile?.customerData) {
      setData((prev) => ({
        ...prev,
        fullName: profile.customerData.fullName || '',
        gender: profile.customerData.gender || '',
        dateOfBirth: profile.customerData.dateOfBirth || '',
        gymId: profile.customerData.gymId || '',
      }));
    }
    setLoading(isLoading);
  }, [profile, isLoading]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <OnboardingContext.Provider value={{ data, updateData, loading }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
