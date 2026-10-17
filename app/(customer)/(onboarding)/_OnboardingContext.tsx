import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useCustomerProfile } from '@/hooks/auth/useCustomerProfile';
import { useUser } from '@/context/UserContext';
import { useUserById } from '@/hooks/users';
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
  const { userId, role } = useUser();
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loading, setLoading] = useState(true);

  const { data: profile, isLoading: isProfileLoading } = useCustomerProfile(userId);
  const { data: userRecord, isLoading: isUserLoading } = useUserById(userId);

  useEffect(() => {
    setData((prev) => {
      const isIndividual = (role || '').trim().toLowerCase() === 'individual';

      let fullName = '';
      let gender = '';
      let dateOfBirth = '';

      if (isIndividual) {
        fullName = userRecord?.name || '';
        const rawGender = (userRecord?.gender || '').toLowerCase();
        gender = rawGender === 'others' ? 'other' : rawGender;
        dateOfBirth = userRecord?.dob || '';
      } else {
        fullName = profile?.customerData?.fullName || '';
        const rawGender = (profile?.customerData?.gender || '').toLowerCase();
        gender = rawGender === 'others' ? 'other' : rawGender;
        const rawDob = profile?.customerData?.dateOfBirth;
        dateOfBirth = rawDob ? (rawDob.includes('T') ? rawDob.split('T')[0] : rawDob) : '';
      }

      // Graceful fallback if target source is missing but secondary has it
      if (!fullName) {
        fullName = isIndividual ? (profile?.customerData?.fullName || '') : (userRecord?.name || '');
      }
      if (!gender) {
        const fallbackGender = (isIndividual ? profile?.customerData?.gender : userRecord?.gender) || '';
        gender = fallbackGender.toLowerCase() === 'others' ? 'other' : fallbackGender.toLowerCase();
      }
      if (!dateOfBirth) {
        const fallbackDob = isIndividual ? profile?.customerData?.dateOfBirth : userRecord?.dob;
        dateOfBirth = fallbackDob ? (fallbackDob.includes('T') ? fallbackDob.split('T')[0] : fallbackDob) : '';
      }

      const newData = {
        ...prev,
        fullName: fullName || prev.fullName,
        gender: gender || prev.gender,
        dateOfBirth: dateOfBirth || prev.dateOfBirth,
        gymId: profile?.customerData?.gymId || prev.gymId || '',
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
    setLoading(isProfileLoading || (role === 'individual' && isUserLoading));
  }, [profile, isProfileLoading, userRecord, isUserLoading, role]);

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
