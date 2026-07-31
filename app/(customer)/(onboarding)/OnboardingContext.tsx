import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
    async function fetchCustomerDetails() {
      if (!userId) return;

      try {
        const { data: customerData, error } = await supabase
          .from('gym_customers')
          .select('fullName, gender, dateOfBirth, gymId')
          .eq('customerId', userId)
          .maybeSingle();

        if (error) {
          console.error('[OnboardingContext] Error fetching gym_customers:', error);
          return;
        }

        if (customerData) {
          setData((prev) => ({
            ...prev,
            fullName: customerData.fullName || '',
            gender: customerData.gender || '',
            dateOfBirth: customerData.dateOfBirth || '',
            gymId: customerData.gymId || '',
          }));
        }
      } catch (err) {
        console.error('[OnboardingContext] Exception fetching customer data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerDetails();
  }, [userId]);

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
