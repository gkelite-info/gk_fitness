import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Lightbulb, Check } from 'phosphor-react-native';
import { useWorkoutPlan } from './_layout';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

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
  const { selectedDays, planDays, resetPlan } = useWorkoutPlan();
  const { userId } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditDay = (day: string) => {
    // If the day is in selectedDays, direct to choose-muscle
    if (selectedDays.includes(day)) {
      router.push({
        pathname: '/(customer)/workoutPlan/choose-muscle' as any,
        params: { day }
      });
    } else {
      // If it's currently a rest/recovery day, let them first go to index to select it if they want
      router.push('/(customer)/workoutPlan' as any);
    }
  };

  const handleSavePlan = async () => {
    if (!userId) {
      toast.error('You must be logged in to save a workout plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Deactivate existing active plans for this user
      await supabase
        .from('customer_workout_plans')
        .update({ isActive: false, updatedAt: new Date().toISOString() })
        .eq('userId', userId)
        .eq('isActive', true);

      // 2. Insert new plan
      const { data: newPlan, error: planError } = await supabase
        .from('customer_workout_plans')
        .insert([
          {
            userId,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (planError || !newPlan) throw planError || new Error("Failed to create workout plan");

      const planId = newPlan.planId;

      // 3. Prepare days and exercises inserts
      for (const day of ALL_DAYS) {
        const isWorkoutDay = selectedDays.includes(day);
        const dayPlan = planDays[day];

        // We insert a row for every day. If it's not a workout day, it's a Rest/Recovery day.
        const workoutType = isWorkoutDay && dayPlan?.workoutType ? dayPlan.workoutType : 'Rest';
        const durationMinutes = isWorkoutDay ? (dayPlan?.durationMinutes || 45) : null;

        const { data: insertedDay, error: dayError } = await supabase
          .from('workout_plan_days')
          .insert([
            {
              planId,
              dayOfWeek: day,
              workoutType,
              durationMinutes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (dayError || !insertedDay) throw dayError || new Error(`Failed to create workout day record for ${day}`);

        // If it's a workout day and has custom exercises, insert them
        if (isWorkoutDay && dayPlan?.exercises && dayPlan.exercises.length > 0) {
          const exercisesToInsert = dayPlan.exercises.map((ex, idx) => ({
            planDayId: insertedDay.planDayId,
            exerciseName: ex.exerciseName,
            category: ex.category,
            reps: ex.reps,
            order: idx,
            image: ex.image || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));

          const { error: exercisesError } = await supabase
            .from('workout_plan_day_exercises')
            .insert(exercisesToInsert);

          if (exercisesError) throw exercisesError;
        }
      }

      toast.success('Workout Plan Saved Successfully!');
      resetPlan();
      // Route back to workout home
      router.replace('/(customer)/workout');
    } catch (error) {
      console.error('[ReviewPlan] Save Error:', error);
      toast.error('Failed to save workout plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workout metrics
  const workoutsCount = selectedDays.length;
  const recoveryCount = 7 - workoutsCount;

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-6 justify-between">
      {/* Header */}
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.push('/(customer)/workoutPlan/assign-days')}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Review Plan</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Title */}
        <Text className="text-white text-2xl font-semibold mb-2">Review Your</Text>
        <Text className="text-white text-2xl font-semibold mb-2">Weekly Plan</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Review your workouts and make any changes before saving your plan.
        </Text>

        {/* Day-by-Day Cards */}
        <View className="gap-3 mb-6">
          {ALL_DAYS.map((day) => {
            const isWorkoutDay = selectedDays.includes(day);
            const dayPlan = planDays[day];
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
                  {/* Left indicator bar for active workout days */}
                  {hasWorkout && (
                    <View className="w-1.5 h-12 rounded-full bg-[#C4EF00] mr-3" />
                  )}

                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center">
                      <Text className="text-[#8E8E8E] font-semibold text-xs mr-2">{day.substring(0, 3).toUpperCase()}</Text>
                      {hasWorkout && <View className="w-1.5 h-1.5 rounded-full bg-[#C4EF00]" />}
                    </View>
                    <Text className="text-white font-semibold text-base mt-0.5">{workoutTitle}</Text>
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

        {/* Plan Summary Section */}
        <View className="bg-[#111111] border border-[#27272A] p-4 rounded-2xl mb-4">
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color="#C4EF00" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Weekly Plan Summary</Text>
          </View>

          <View className="flex-row justify-around border-b border-[#27272A]/50 pb-4 mb-4">
            <View className="items-center">
              <Text className="text-[#C4EF00] font-black text-3xl">{workoutsCount}</Text>
              <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-wider mt-0.5">WORKOUTS</Text>
            </View>
            <View className="w-[1px] bg-[#27272A]/50" />
            <View className="items-center">
              <Text className="text-white font-black text-3xl">{recoveryCount}</Text>
              <Text className="text-[#8E8E8E] text-[10px] font-semibold tracking-wider mt-0.5">RECOVERY</Text>
            </View>
          </View>

          {/* Tip Box */}
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
      </ScrollView>

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
    </View>
  );
}
