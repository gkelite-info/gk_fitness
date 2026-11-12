import * as Crypto from 'expo-crypto';
import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Lightbulb } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { saveCustomerWorkoutPlan, deactivateCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { saveWorkoutPlanDay } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { saveWorkoutPlanDayExercise } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import { useQueryClient } from '@tanstack/react-query';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || 'https://gkgymlife.com';

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function ReviewPlan() {
  const { selectedDays, planDays, resetPlan, planMode, currentEditingWeek, setCurrentEditingWeek } = useWorkoutPlan();
  const { userId } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleEditDay = (day: string) => {
    try {
      if (selectedDays.includes(day)) {
        router.push({
          pathname: '/(customer)/workoutPlan/choose-muscle' as any,
          params: { day }
        });
      } else {
        router.push('/(customer)/workoutPlan' as any);
      }
    } catch (error) {
      console.error('[ReviewPlan] handleEditDay Error:', error);
    }
  };

  const handleSavePlan = async () => {
    if (!userId) {
      toast.error('You must be logged in to save a workout plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const templateWeek = (planDays[1] && Object.keys(planDays[1]).length > 0)
        ? planDays[1]
        : (planDays[currentEditingWeek] && Object.keys(planDays[currentEditingWeek]).length > 0)
          ? planDays[currentEditingWeek]
          : (planDays[2] || planDays[3] || planDays[4] || {});

      let savedSuccessfully = false;

      // 1. Try direct client-side Supabase insert first
      try {
        await deactivateCustomerWorkoutPlans(userId);

        const newPlan = await saveCustomerWorkoutPlan({
          userId,
          isActive: true,
        });

        if (!newPlan) throw new Error('Failed to create workout plan');

        const planId = newPlan.planId;
        const weeksToSave = [1, 2, 3, 4];
        const daysToInsert: any[] = [];
        const exercisesToInsert: any[] = [];
        const now = new Date().toISOString();

        // Preload valid workout IDs from workouts table to avoid foreign key errors
        let validWorkoutIds = new Set<string>();
        try {
          const { data: wList } = await supabase.from('workouts').select('workoutId').eq('is_deleted', false);
          if (wList) validWorkoutIds = new Set(wList.map((w: any) => w.workoutId));
        } catch { }

        // Preload valid workout video IDs to avoid foreign key errors
        let validVideoIds = new Set<string>();
        try {
          const { data: vList } = await supabase.from('workout_videos').select('workoutVideoId').eq('is_deleted', false);
          if (vList) validVideoIds = new Set(vList.map((v: any) => v.workoutVideoId));
        } catch { }

        for (const week of weeksToSave) {
          const weekData = planMode === 'repeat' ? templateWeek : (planDays[week] || templateWeek);

          for (const day of ALL_DAYS) {
            const isWorkoutDay = selectedDays.includes(day);
            const dayPlan = weekData[day];

            const workoutType = isWorkoutDay && dayPlan?.workoutType ? dayPlan.workoutType : 'Rest';
            const durationMinutes = isWorkoutDay ? (dayPlan?.durationMinutes || 45) : null;

            const rawWorkoutId = isWorkoutDay ? dayPlan?.workoutId : null;
            const safeWorkoutId = (rawWorkoutId && validWorkoutIds.has(rawWorkoutId))
              ? rawWorkoutId
              : null;

            const planDayId = Crypto.randomUUID();

            daysToInsert.push({
              planDayId,
              planId,
              dayOfWeek: day,
              workoutType,
              workoutId: safeWorkoutId,
              durationMinutes,
              weekNumber: week,
              createdAt: now,
              updatedAt: now,
            });

            if (isWorkoutDay && dayPlan?.exercises && dayPlan.exercises.length > 0) {
              for (let idx = 0; idx < dayPlan.exercises.length; idx++) {
                const ex = dayPlan.exercises[idx];
                const rawVideoId = ex.workoutVideoId;
                const safeVideoId = (rawVideoId && validVideoIds.has(rawVideoId))
                  ? rawVideoId
                  : null;

                exercisesToInsert.push({
                  dayExerciseId: Crypto.randomUUID(),
                  planDayId,
                  workoutVideoId: safeVideoId,
                  exerciseName: ex.exerciseName || 'Exercise',
                  category: ex.category || 'General',
                  sets: Number(ex.sets) > 0 ? Number(ex.sets) : 3,
                  reps: ex.reps?.toString().trim() || '10-12',
                  order: idx,
                  image: ex.image || null,
                  videoUrl: ex.videoUrl || null,
                  createdAt: now,
                  updatedAt: now,
                });
              }
            }
          }
        }

        // Batch insert days
        const { error: daysError } = await supabase
          .from('workout_plan_days')
          .insert(daysToInsert);

        if (daysError) throw daysError;

        // Batch insert exercises
        if (exercisesToInsert.length > 0) {
          const { error: exError } = await supabase
            .from('workout_plan_day_exercises')
            .insert(exercisesToInsert);

          if (exError) throw exError;
        }

        savedSuccessfully = true;
      } catch (directError: any) {
        console.warn('[ReviewPlan] Direct Supabase save error (likely RLS or session expired), trying backend API fallback:', directError?.message || directError);

        // 2. Fallback to secure server API route (bypasses RLS on backend with service role)
        try {
          const apiRes = await fetch(`${SITE_URL}/api/workout-plan/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              planMode,
              selectedDays,
              planDays,
            }),
          });

          if (!apiRes.ok) {
            const errData = await apiRes.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${apiRes.status}`);
          }

          savedSuccessfully = true;
        } catch (apiError) {
          console.error('[ReviewPlan] Backend API fallback save failed:', apiError);
          throw directError;
        }
      }

      if (savedSuccessfully) {
        toast.success('Workout Plan Saved Successfully!');

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['customerDashboardData'] }),
          queryClient.invalidateQueries({ queryKey: ['customerWeeklyPlan'] }),
          queryClient.invalidateQueries({ queryKey: ['workoutPlanDay'] }),
          queryClient.invalidateQueries({ queryKey: ['customerWorkoutPlans'] }),
        ]);

        router.replace({
          pathname: '/(customer)/workoutPlan/success' as any,
          params: { workoutsCount: String(selectedDays.length) }
        });
      }
    } catch (error) {
      console.error('[ReviewPlan] Save Error:', error);
      toast.error('Failed to save workout plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const workoutsCount = selectedDays.length;
  const recoveryCount = 7 - workoutsCount;

  return (
    <View className="flex-1 bg-black pb-28">
      <View className="px-5 pt-5 pb-4 flex-row items-center border-b border-[#27272A] bg-black">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full bg-[#18181A] border border-[#27272A] mr-3 active:opacity-75"
        >
          <ArrowLeft size={20} color="#FFFFFF" weight="bold" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-xl font-semibold tracking-tight">Review Your Plan</Text>
          <Text className="text-[#8E8E8E] text-xs mt-0.5">Customized 4-Week Schedule</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row bg-[#141414] p-1 rounded-2xl mb-5 border border-[#27272A]">
          {[1, 2, 3, 4].map((wk) => {
            const isActive = currentEditingWeek === wk;
            return (
              <Pressable
                key={wk}
                onPress={() => setCurrentEditingWeek(wk)}
                className={`flex-1 py-2.5 rounded-xl items-center justify-center ${isActive ? 'bg-[#C4EF00]' : 'bg-transparent'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${isActive ? 'text-black' : 'text-[#8E8E8E]'
                    }`}
                >
                  WEEK {wk}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Schedule List */}
        <View className="gap-2.5 mb-6">
          {ALL_DAYS.map((day) => {
            const isWorkoutDay = selectedDays.includes(day);
            const weekData = planDays[currentEditingWeek] || {};
            const dayPlan = weekData[day];
            const hasWorkout = isWorkoutDay && dayPlan && dayPlan.workoutType;

            let workoutTitle = "Rest Day";
            let workoutSubtitle = "Active Recovery • Mobility";
            let actionLabel = "RELAX";

            if (day === 'Sunday') {
              workoutTitle = "Recovery Day";
              workoutSubtitle = "Light Activity • Walk";
              actionLabel = "RECOVER";
            }

            if (hasWorkout) {
              workoutTitle = `${dayPlan.workoutType} Workout`;
              workoutSubtitle = `${dayPlan.exercises?.length || 0} Exercises • ${dayPlan.durationMinutes || 45} min`;
            }

            return (
              <View
                key={day}
                className="flex-row items-center border border-[#27272A] bg-[#111111] p-4 rounded-2xl justify-between"
              >
                <View className="flex-row items-center flex-1">
                  {hasWorkout && (
                    <View className="w-1.5 h-12 rounded-full bg-[#C4EF00] mr-3" />
                  )}

                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center">
                      <Text className="text-[#8E8E8E] font-semibold text-xs mr-2">{day.substring(0, 3).toUpperCase()}</Text>
                      {hasWorkout && <View className="w-1.5 h-1.5 rounded-full bg-[#C4EF00]" />}
                    </View>
                    <Text className="text-white font-semibold text-base mt-0.5">
                      {workoutTitle.charAt(0).toUpperCase() + workoutTitle.slice(1)}
                    </Text>
                    <Text className="text-[#8E8E8E] text-xs mt-0.5">{workoutSubtitle}</Text>
                  </View>
                </View>

                {hasWorkout ? (
                  <Pressable
                    onPress={() => handleEditDay(day)}
                    className="flex-row items-center border border-[#27272A] bg-[#161616] px-3.5 py-2 rounded-xl active:bg-[#C4EF00]/10"
                  >
                    <Text className="text-white font-semibold text-xs mr-1">Edit</Text>
                  </Pressable>
                ) : (
                  <Text className="text-[#555] font-black text-xs tracking-wider mr-2">{actionLabel}</Text>
                )}
              </View>
            );
          })}
        </View>

        <View className="bg-[#111111] border border-[#27272A] p-4 rounded-2xl mb-4">
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color="#C4EF00" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Monthly Plan Summary</Text>
          </View>

          <View className="flex-row justify-around border-b border-[#27272A]/50 pb-4 mb-4">
            <View className="items-center">
              <Text className="text-[#C4EF00] font-semibold text-3xl">{workoutsCount}</Text>
              <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-wider mt-0.5">WORKOUTS</Text>
            </View>
            <View className="w-[1px] bg-[#27272A]/50" />
            <View className="items-center">
              <Text className="text-white font-semibold text-3xl">{recoveryCount}</Text>
              <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-wider mt-0.5">RECOVERY</Text>
            </View>
          </View>

          <View className="flex-row items-start bg-[#161616] p-3.5 rounded-xl border border-[#242424]">
            <View className="mr-2.5 mt-0.5">
              <Lightbulb size={18} color="#C4EF00" weight="fill" />
            </View>
            <Text className="text-[#8E8E8E] text-xs flex-1 leading-4">
              {workoutsCount >= 3 && workoutsCount <= 5
                ? "Great balance! Your plan looks well structured for your goal. Stay consistent and see the results! 💪"
                : workoutsCount > 5
                  ? "Hardcore plan! Make sure you get enough sleep and protein to recover. Don't overtrain! ⚡"
                  : "A light start is a good start. Gradually build up the days as you get stronger! 🚀"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSavePlan}
          disabled={isSubmitting || selectedDays.length === 0}
          className={`w-full py-4 bg-[#C4EF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4 h-14`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Text className="text-black text-base font-semibold">Save Plan</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
