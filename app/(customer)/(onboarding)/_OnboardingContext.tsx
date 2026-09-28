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
  preferredCuisine?: string;
  calorieDistribution?: string;
  goalTimeframe?: string;
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
  goalTimeframe: '',
};

const OnboardingContext = createContext<OnboardingContextType>({
  data: initialData,
  updateData: () => { },
  loading: true,
});

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { userId } = useUser();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loading, setLoading] = useState(true);

  const { data: profile, isLoading } = useCustomerProfile(userId);

  useEffect(() => {
      setData((prev) => {
        const newData = {
          ...prev,
          fullName: profile?.customerData?.fullName || '',
          gender: profile?.customerData?.gender || '',
          dateOfBirth: profile?.customerData?.dateOfBirth || '',
          gymId: profile?.customerData?.gymId || '',
        };

        if (profile?.onboardingData) {
          const ob = profile.onboardingData;
          newData.height = ob.height || '';
          newData.weight = ob.weight || '';
          
          const reverseGoalMap: Record<string, string> = {
            'loseweight': 'weightloss',
            'buildmuscle': 'musclegain',
            'stayfit': 'maintainfitness',
            'imporoveendurance': 'improveendurance'
          };
          newData.primaryGoal = reverseGoalMap[ob.primaryGoal] || ob.primaryGoal || '';
          
          newData.targetWeight = ob.targetWeight || '';
          newData.workoutLocation = ob.workoutLocation || '';
          newData.workoutDays = ob.workoutDays || [];
          newData.preferWorkoutTime = ob.preferWorkoutTime || '';
          newData.dietType = ob.dietType || '';
          newData.mealsPerDay = ob.mealsPerDay || null;
          newData.foodAllergies = ob.foodAllergies || [];
          newData.dailyWaterGoal = ob.dailyWaterGoal ? parseFloat(ob.dailyWaterGoal) : 3.0;
          newData.preferredCuisine = ob.preferredCuisine || '';
          newData.calorieDistribution = ob.calorieDistribution || '';
          newData.goalTimeframe = ob.goalTimeframe || '';
        }
        
        return newData;
      });
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

export default function Ignored() { return null; }
