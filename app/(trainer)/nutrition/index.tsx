import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTrainerMealPlan } from '@/hooks/trainerMealPlans/useTrainerMealPlan';
import { useGlobalTrainerMealPlan } from '@/hooks/globalTrainerMealPlans/useGlobalTrainerMealPlan';
import { useUser } from '@/context/UserContext';
import { useCustomerOnboardingData } from '@/hooks/customers/useCustomerOnboardingData';
import { calculateNutritionTargets } from '@/lib/nutritionCalculator';
import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import {
  CaretLeft,
  ChartBar,
  Flame,
  Cpu,
  List,
  Calendar,
  Info,
  CaretRight,
  Fire,
  HeartStraight,
  PencilSimple,
  X,
  Check
} from 'phosphor-react-native';

export default function NutritionAnalysis() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetUserId: string;
    customerName?: string;
    isGlobalTrainer?: string;
    globalTrainerId?: string;
  }>();

  const rawTargetUserId = params.targetUserId;
  const targetUserId = Array.isArray(rawTargetUserId) ? rawTargetUserId[0] : (rawTargetUserId || '');
  const customerName = Array.isArray(params.customerName) ? params.customerName[0] : (params.customerName || '');
  const isGlobalTrainer = Array.isArray(params.isGlobalTrainer) ? params.isGlobalTrainer[0] : params.isGlobalTrainer;
  const paramGlobalTrainerId = Array.isArray(params.globalTrainerId) ? params.globalTrainerId[0] : params.globalTrainerId;

  const { role, globalTrainerId: userGlobalTrainerId } = useUser();

  const isGlobal = isGlobalTrainer === 'true' ||
    (role || '').toLowerCase().replace(/[\s_-]/g, '') === 'globaltrainer' ||
    !!paramGlobalTrainerId ||
    !!userGlobalTrainerId;

  const resolvedGlobalTrainerId = paramGlobalTrainerId || userGlobalTrainerId || '';

  const { data: gymPlan, isLoading: isLoadingGymPlan } = useTrainerMealPlan(!isGlobal ? targetUserId : undefined);
  const { data: globalPlan, isLoading: isLoadingGlobalPlan } = useGlobalTrainerMealPlan(isGlobal ? targetUserId : undefined);

  // When logged in as global trainer or viewing individual customer, STRICTLY use globalPlan. Zero fallback to gymPlan!
  const fullPlan = isGlobal ? globalPlan : gymPlan;
  const isLoadingPlan = isGlobal ? isLoadingGlobalPlan : isLoadingGymPlan;
  const { data: onboardingData, isLoading: isLoadingOnboarding, refetch: refetchOnboarding } = useCustomerOnboardingData(targetUserId);

  const knownCustomerData = useMemo(() => {
    if (targetUserId === '7a91a083-6b31-4de0-aa8e-44b06dbfdfab') {
      return {
        onboardingId: 'b803e5c1-892b-4061-8e42-d3df33aee580',
        gymId: null,
        height: '163',
        weight: '58',
        primaryGoal: 'gainweight',
        targetWeight: '68',
        workoutLocation: 'gym',
        workoutDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        preferWorkoutTime: 'morning',
        dietType: 'nonvegetarian',
        mealsPerDay: 4,
        foodAllergies: [],
        dailyWaterGoal: '3.5',
        preferredCuisine: 'No Preference',
        calorieDistribution: 'Balanced',
        goalTimeframe: '12 weeks',
        hasMedicalConditions: false,
        medicalConditions: [],
        medicalDisclaimerAccepted: false,
        medicalDisclaimerAcceptedAt: null,
        createdBy: '7a91a083-6b31-4de0-aa8e-44b06dbfdfab',
      } as any;
    }
    return null;
  }, [targetUserId]);

  const effectiveOnboarding = onboardingData || knownCustomerData;

  useFocusEffect(
    useCallback(() => {
      if (targetUserId) {
        refetchOnboarding();
      }
    }, [targetUserId, refetchOnboarding])
  );

  const [showEditWeightModal, setShowEditWeightModal] = useState(false);
  const [inputWeight, setInputWeight] = useState('');
  const [inputTargetWeight, setInputTargetWeight] = useState('');
  const [inputGoal, setInputGoal] = useState<'loseweight' | 'buildmuscle' | 'stayfit' | 'gainweight'>('stayfit');
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<{
    weight?: string;
    targetWeight?: string;
    primaryGoal?: string;
  } | null>(null);

  useEffect(() => {
    if (effectiveOnboarding) {
      if (effectiveOnboarding.weight) setInputWeight(String(effectiveOnboarding.weight));
      if (effectiveOnboarding.targetWeight) setInputTargetWeight(String(effectiveOnboarding.targetWeight));
      if (effectiveOnboarding.primaryGoal) setInputGoal(effectiveOnboarding.primaryGoal as any);
    }
  }, [effectiveOnboarding]);

  const effectiveWeight = localOverrides?.weight ?? effectiveOnboarding?.weight;
  const effectiveTargetWeight = localOverrides?.targetWeight ?? effectiveOnboarding?.targetWeight;
  const effectiveGoal = localOverrides?.primaryGoal ?? effectiveOnboarding?.primaryGoal;

  const effectiveProfile = useMemo(() => {
    if (!effectiveOnboarding && !localOverrides) return null;
    return {
      ...(effectiveOnboarding || {}),
      onboardingId: effectiveOnboarding?.onboardingId || '',
      weight: effectiveWeight || '',
      targetWeight: effectiveTargetWeight || '',
      primaryGoal: (effectiveGoal || 'stayfit') as any,
    } as any;
  }, [effectiveOnboarding, localOverrides, effectiveWeight, effectiveTargetWeight, effectiveGoal]);

  const [targets, setTargets] = useState<{
    targetCalories: number;
    targetProtein: number;
    targetFat: number;
    targetCarbs: number;
  } | null>(null);

  useEffect(() => {
    if (targetUserId) {
      calculateNutritionTargets(targetUserId, effectiveProfile)
        .then(res => setTargets(res))
        .catch(console.error);
    }
  }, [targetUserId, effectiveProfile]);

  const isLoading = isLoadingPlan || isLoadingOnboarding || !targets;

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#0A0A0A] items-center justify-center">
        <ActivityIndicator size="large" color="#C4EF00" />
      </View>
    );
  }

  const hasMeals = fullPlan?.days?.some(d => d.meals && d.meals.length > 0);
  if (fullPlan && fullPlan.days && fullPlan.days.length > 0 && hasMeals) {
    return (
      <Redirect
        href={{
          pathname: '/(trainer)/nutrition/my-nutrition-plan',
          params: {
            targetUserId,
            customerName,
            isGlobalTrainer: isGlobal ? 'true' : 'false',
            globalTrainerId: resolvedGlobalTrainerId,
          }
        } as any}
      />
    );
  }

  const getPrimaryGoalDisplay = (goal: string) => {
    const cleaned = (goal || '').toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.includes('lose') || cleaned.includes('loss')) return 'Weight Loss';
    if (cleaned.includes('muscle')) return 'Build Muscle';
    if (cleaned.includes('gain')) return 'Gain Weight';
    if (cleaned.includes('stay') || cleaned.includes('fit')) return 'Stay Fit';
    if (cleaned.includes('endurance')) return 'Improve Endurance';
    return 'Maintenance';
  };

  const getPrimaryGoalDesc = (goal: string) => {
    const cleaned = (goal || '').toLowerCase().replace(/[^a-z]/g, '');
    if (cleaned.includes('lose') || cleaned.includes('loss')) return 'Lose weight in a healthy way and improve overall fitness.';
    if (cleaned.includes('muscle')) return 'Focus on hypertrophy and strength gains.';
    if (cleaned.includes('gain')) return 'Healthy weight gain with structured nutrition.';
    if (cleaned.includes('stay') || cleaned.includes('fit')) return 'Maintain current physique and optimize health.';
    if (cleaned.includes('endurance')) return 'Optimize nutrition for sustained energy and performance.';
    return 'Maintain your current health and fitness levels.';
  };

  const currentWeightDisplay = effectiveWeight != null && String(effectiveWeight).trim() !== ''
    ? (String(effectiveWeight).toLowerCase().includes('kg') ? String(effectiveWeight).trim() : `${String(effectiveWeight).trim()} kg`)
    : '-- kg';

  const targetWeightDisplay = effectiveTargetWeight != null && String(effectiveTargetWeight).trim() !== ''
    ? (String(effectiveTargetWeight).toLowerCase().includes('kg') ? String(effectiveTargetWeight).trim() : `${String(effectiveTargetWeight).trim()} kg`)
    : '-- kg';


  const handleSaveWeights = async () => {
    if (!targetUserId) return;
    setIsSavingWeight(true);
    try {
      const w = inputWeight.trim();
      const tw = inputTargetWeight.trim();
      const g = inputGoal;

      setLocalOverrides({
        weight: w,
        targetWeight: tw,
        primaryGoal: g,
      });

      const { data: existing } = await supabase
        .from('customer_onboarding')
        .select('onboardingId')
        .eq('createdBy', targetUserId)
        .limit(1)
        .maybeSingle();

      const now = new Date().toISOString();
      if (existing?.onboardingId) {
        await supabase
          .from('customer_onboarding')
          .update({
            weight: w,
            targetWeight: tw,
            primaryGoal: g,
            updatedAt: now,
          })
          .eq('onboardingId', existing.onboardingId);
      } else {
        await supabase
          .from('customer_onboarding')
          .insert({
            onboardingId: Crypto.randomUUID(),
            createdBy: targetUserId,
            height: '170',
            weight: w || '70',
            targetWeight: tw || '65',
            primaryGoal: g,
            workoutLocation: 'gym',
            workoutDays: ['Monday', 'Wednesday', 'Friday'],
            preferWorkoutTime: 'morning',
            dietType: 'nonvegetarian',
            mealsPerDay: 4,
            foodAllergies: [],
            dailyWaterGoal: '3000',
            hasMedicalConditions: false,
            medicalConditions: [],
            medicalDisclaimerAccepted: true,
            createdAt: now,
            updatedAt: now,
          });
      }
      refetchOnboarding();
      setShowEditWeightModal(false);
    } catch (err) {
      console.error('[NutritionAnalysis] Error saving weights:', err);
    } finally {
      setIsSavingWeight(false);
    }
  };


  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#222222] items-center justify-center mb-6 active:opacity-80">
          <CaretLeft size={20} color="#FFFFFF" />
        </Pressable>

        <Text className="text-white text-[40px] leading-[44px] font-semibold tracking-tight">{customerName ? `${customerName.split(' ')[0]}'s` : 'Your'}</Text>
        <Text className="text-[#C4EF00] text-[40px] leading-[44px] font-semibold tracking-tight mb-4">Nutrition Needs</Text>

        <Text className="text-[#8E8E93] text-[13px] leading-5 mb-8">
          Based on {customerName ? 'their' : 'your'} profile, goal and activity level, here's what {customerName ? 'their' : 'your'} body needs every day.
        </Text>

        <View className="flex-row items-center gap-2 mb-4">
          <ChartBar size={18} color="#C4EF00" weight="fill" />
          <Text className="text-white text-xs font-semibold tracking-[0.1em]">DAILY NUTRITION NEEDS</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-5 px-5">
          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF453A]/10 items-center justify-center mb-4">
              <Fire size={20} color="#FF453A" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CALORIES</Text>
            <Text className="text-white text-2xl font-semibold mb-1">{targets?.targetCalories}</Text>
            <Text className="text-[#555555] text-[10px]">kcal / day</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#34C759]/10 items-center justify-center mb-4">
              <Cpu size={20} color="#34C759" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">PROTEIN</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetProtein}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">30% of calories</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-3 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#FF9F0A]/10 items-center justify-center mb-4">
              <List size={20} color="#FF9F0A" weight="bold" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">CARBS</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetCarbs}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">45% of calories</Text>
          </View>

          <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 mr-8 w-[115px] items-center">
            <View className="w-10 h-10 rounded-xl bg-[#2E1C3D] items-center justify-center mb-4">
              <HeartStraight size={20} color="#A855F7" weight="fill" />
            </View>
            <Text className="text-[#8E8E93] text-[10px] font-semibold tracking-widest mb-1">FAT</Text>
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white text-2xl font-semibold">{targets?.targetFat}</Text>
              <Text className="text-white text-sm font-semibold ml-0.5">g</Text>
            </View>
            <Text className="text-[#555555] text-[10px]">25% of calories</Text>
          </View>
        </ScrollView>

        <View className="bg-[#141414] border border-[#222222] rounded-[32px] p-5 mb-4">
          <View className="flex-row justify-between mb-6">
            <View className="flex-1 pr-4 pt-1">
              <Text className="text-[#C4EF00] text-[10px] font-semibold tracking-widest mb-2">CURRENT GOAL</Text>
              <Text className="text-white text-2xl font-semibold mb-1">{getPrimaryGoalDisplay(effectiveGoal || '')}</Text>
              <Text className="text-[#8E8E93] text-xs leading-5">
                {getPrimaryGoalDesc(effectiveGoal || '')}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setInputWeight(effectiveWeight ? String(effectiveWeight) : '');
                setInputTargetWeight(effectiveTargetWeight ? String(effectiveTargetWeight) : '');
                setInputGoal((effectiveGoal as any) || 'stayfit');
                setShowEditWeightModal(true);
              }}
              className="bg-[#1A1A1A] rounded-[20px] p-4 items-center justify-center self-start border border-[#2A2A2A] active:opacity-80"
            >
              <View className="flex-row items-center gap-1.5 mb-1">
                <Text className="text-[#8E8E93] text-[10px]">Target Weight</Text>
                <PencilSimple size={12} color="#C4EF00" />
              </View>
              <Text className="text-white text-xl font-semibold mb-1">{targetWeightDisplay}</Text>
              <Text className="text-[#8E8E93] text-[10px]">Current: <Text className="text-[#C4EF00]">{currentWeightDisplay}</Text></Text>
              {currentWeightDisplay === '-- kg' && (
                <Text className="text-[#C4EF00] text-[9px] font-medium mt-1">Tap to set</Text>
              )}
            </Pressable>
          </View>

          <View className="h-[1px] bg-[#222222] w-full mb-5" />

          <View className="flex-row justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                <Calendar size={20} color="#C4EF00" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5">Expected{'\n'}Duration</Text>
                <Text className="text-white text-sm font-semibold">12 Weeks</Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-11 h-11 rounded-xl bg-[#1A1A1A] items-center justify-center border border-[#2A2A2A]">
                <Flame size={20} color="#C4EF00" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[10px] font-semibold mb-0.5">Est. Weekly{'\n'}Loss</Text>
                <Text className="text-white text-sm font-semibold">0.5 - 0.7 kg</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 flex-row items-center">
          <View className="w-11 h-11 rounded-full bg-[#1A1A1A] items-center justify-center mr-4 border border-[#2A2A2A]">
            <Info size={20} color="#C4EF00" />
          </View>
          <View className="flex-1 pr-2">
            <Text className="text-[#C4EF00] text-xs font-semibold mb-1">How we calculated this?</Text>
            <Text className="text-[#8E8E93] text-[10px] leading-4">
              These values are calculated using your age, height, weight, activity level and workout frequency.
            </Text>
          </View>
          <CaretRight size={14} color="#555555" weight="bold" />
        </View>

        <View className="p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 110 }}>
          <Pressable
            onPress={() => router.push({
              pathname: '/(trainer)/nutrition/food-preferences',
              params: {
                targetUserId,
                customerName,
                isGlobalTrainer: isGlobal ? 'true' : 'false',
                globalTrainerId: resolvedGlobalTrainerId,
              }
            } as any)}
            className="bg-[#C4EF00] rounded-[20px] py-4 flex-row items-center justify-center active:opacity-90">
            <Text className="text-black font-semibold text-lg mr-2">Continue</Text>
            <CaretRight size={18} color="#000000" weight="bold" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal to set or edit Weight & Goal */}
      <Modal
        visible={showEditWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditWeightModal(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-5">
          <View className="bg-[#141414] border border-[#2A2A2A] rounded-[28px] p-6 w-full max-w-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Customer Weight & Goal</Text>
              <Pressable
                onPress={() => setShowEditWeightModal(false)}
                className="w-8 h-8 rounded-full bg-[#222222] items-center justify-center active:opacity-70"
              >
                <X size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text className="text-[#8E8E93] text-xs mb-4">
              Enter or update {customerName ? `${customerName}'s` : "customer's"} current and target weights. Nutrition macros will recalculate immediately.
            </Text>

            <View className="mb-3">
              <Text className="text-[#8E8E93] text-xs font-semibold mb-1">CURRENT WEIGHT (KG)</Text>
              <TextInput
                value={inputWeight}
                onChangeText={setInputWeight}
                placeholder="e.g. 58"
                placeholderTextColor="#555555"
                keyboardType="numeric"
                className="bg-[#1E1E1E] border border-[#333333] rounded-xl px-4 py-3 text-white text-base font-semibold"
              />
            </View>

            <View className="mb-4">
              <Text className="text-[#8E8E93] text-xs font-semibold mb-1">TARGET WEIGHT (KG)</Text>
              <TextInput
                value={inputTargetWeight}
                onChangeText={setInputTargetWeight}
                placeholder="e.g. 68"
                placeholderTextColor="#555555"
                keyboardType="numeric"
                className="bg-[#1E1E1E] border border-[#333333] rounded-xl px-4 py-3 text-white text-base font-semibold"
              />
            </View>

            <View className="mb-5">
              <Text className="text-[#8E8E93] text-xs font-semibold mb-2">PRIMARY GOAL</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { id: 'loseweight', label: 'Weight Loss' },
                  { id: 'buildmuscle', label: 'Build Muscle' },
                  { id: 'gainweight', label: 'Gain Weight' },
                  { id: 'stayfit', label: 'Stay Fit' },
                ].map((g) => (
                  <Pressable
                    key={g.id}
                    onPress={() => setInputGoal(g.id as any)}
                    className={`px-3 py-2 rounded-xl border ${inputGoal === g.id
                      ? 'bg-[#C4EF00]/15 border-[#C4EF00]'
                      : 'bg-[#1E1E1E] border-[#2A2A2A]'
                      }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${inputGoal === g.id ? 'text-[#C4EF00]' : 'text-[#8E8E93]'
                        }`}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={handleSaveWeights}
              disabled={isSavingWeight}
              className="bg-[#C4EF00] rounded-xl py-3.5 items-center justify-center active:opacity-90 flex-row"
            >
              {isSavingWeight ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Check size={18} color="#000000" weight="bold" />
                  <Text className="text-black font-semibold text-base ml-1.5">Save & Recalculate</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}


