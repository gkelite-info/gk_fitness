import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router } from 'expo-router';
import { ArrowLeft, Calendar, Lightbulb } from 'phosphor-react-native';
import { useTrainerWorkoutPlan } from './_layout';
import { useUser } from '@/context/UserContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { saveTrainerWorkoutPlan, deactivateTrainerWorkoutPlans } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlans';
import { saveTrainerWorkoutPlanDay } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDays';
import { saveTrainerWorkoutPlanDayExercise } from '@/helpers/trainerWorkoutPlans/trainerWorkoutPlanDayExercises';
import {
  saveIndividualTrainerWorkoutPlan,
  deactivateIndividualTrainerWorkoutPlans,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlan';
import {
  saveIndividualTrainerWorkoutPlanDay,
  DayOfWeek,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDay';
import {
  saveIndividualTrainerWorkoutPlanDayExercise,
} from '@/helpers/individualTrainerWorkoutPlans/IndividualTrainerWorkoutPlanDayExercise';
import {
  useSaveIndividualTrainerWorkoutPlan,
  useDeactivateIndividualTrainerWorkoutPlans,
  useSaveIndividualTrainerWorkoutPlanDay,
  useSaveIndividualTrainerWorkoutPlanDayExercise,
} from '@/hooks/individualTrainerWorkoutPlans';

const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export default function ReviewTrainerPlanScreen() {
  const {
    targetUserId,
    selectedDays,
    planDays,
    isGlobalTrainer: contextIsGlobalTrainer,
    globalTrainerId: contextGlobalTrainerId,
  } = useTrainerWorkoutPlan();
  const { userId: trainerUserId, role, globalTrainerId: userGlobalTrainerId, email } = useUser();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditDay = (day: string) => {
    try {
      if (selectedDays.includes(day)) {
        router.push({
          pathname: '/(trainer)/workoutPlan/choose-muscle' as any,
          params: { day }
        });
      } else {
        router.push('/(trainer)/workoutPlan' as any);
      }
    } catch (error) {
      console.error('[ReviewTrainerPlanScreen] handleEditDay Error:', error);
    }
  };

  const handleSavePlan = async () => {
    if (!trainerUserId) {
      console.error('[ReviewTrainerPlanScreen] Trainer session not found (trainerUserId is missing).');
      toast.error('Trainer session not found. Please log in again.');
      return;
    }

    if (!targetUserId) {
      console.error('[ReviewTrainerPlanScreen] targetUserId is missing.');
      toast.error('No customer selected. Please go back and select a customer.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Determine if trainer is a global trainer
      const isGlobalTrainerRole = (role || '').toLowerCase().replace(/[\s_-]/g, '') === 'globaltrainer';
      let resolvedGlobalTrainerId = contextGlobalTrainerId || userGlobalTrainerId || null;

      if (!resolvedGlobalTrainerId && (isGlobalTrainerRole || contextIsGlobalTrainer || trainerUserId)) {
        let query = supabase.from('global_trainers').select('globalTrainerId');
        if (trainerUserId && email) {
          query = query.or(`userId.eq.${trainerUserId},email.eq.${email}`);
        } else if (trainerUserId) {
          query = query.eq('userId', trainerUserId);
        } else if (email) {
          query = query.eq('email', email);
        }
        const { data: gt, error: gtErr } = await query.maybeSingle();
        if (gtErr) {
          console.error('[ReviewTrainerPlanScreen] Error querying global_trainers:', gtErr);
        }
        if (gt?.globalTrainerId) {
          resolvedGlobalTrainerId = gt.globalTrainerId;
        }
      }

      const isGlobalTrainer = isGlobalTrainerRole || !!resolvedGlobalTrainerId || !!contextIsGlobalTrainer;

      if (isGlobalTrainer) {
        if (!resolvedGlobalTrainerId) {
          console.error('[ReviewTrainerPlanScreen] FAILED: User is global trainer but globalTrainerId could not be resolved!');
          toast.error('Global Trainer profile ID not found. Please contact support.');
          return;
        }

        // Resolve customer's users.userId for foreign key individual_trainer_workout_plans_userId_fkey
        let customerUserId = targetUserId;

        const { data: directUser, error: directUserErr } = await supabase
          .from('users')
          .select('userId')
          .eq('userId', targetUserId)
          .maybeSingle();

        if (directUser?.userId) {
          customerUserId = directUser.userId;
        } else {
          const { data: gymCustMatch, error: gymCustErr } = await supabase
            .from('gym_customers')
            .select('userId, customerId')
            .or(`customerId.eq.${targetUserId},userId.eq.${targetUserId}`)
            .maybeSingle();

          if (gymCustMatch?.userId) {
            customerUserId = gymCustMatch.userId;
          } else {
            const { data: indCustMatch, error: indCustErr } = await supabase
              .from('individual_customer_trainers')
              .select('userId, individualCustomerTrainerId')
              .or(`individualCustomerTrainerId.eq.${targetUserId},userId.eq.${targetUserId}`)
              .maybeSingle();

            if (indCustMatch?.userId) {
              customerUserId = indCustMatch.userId;
            } else {
              console.warn('[ReviewTrainerPlanScreen] Fallback: using original targetUserId:', customerUserId);
            }
          }
        }

        // 1. Deactivate old active plans for customer
        try {
          await deactivateIndividualTrainerWorkoutPlans(customerUserId);
        } catch (deactErr) {
          console.error('[ReviewTrainerPlanScreen] [Table 1] Deactivate old plans warning:', deactErr);
        }

        // 2. Insert into individual_trainer_workout_plans

        const newPlan = await saveIndividualTrainerWorkoutPlan({
          userId: customerUserId,
          createdBy: resolvedGlobalTrainerId,
          isActive: true,
        });


        if (!newPlan || !newPlan.planId) {
          console.error('[ReviewTrainerPlanScreen] [Table 1] FAILED: No planId returned from individual_trainer_workout_plans!');
          throw new Error('Failed to create individual trainer workout plan: No planId returned.');
        }

        const planId = newPlan.planId;

        // 3. Save each day into individual_trainer_workout_plan_days

        for (const day of ALL_DAYS) {
          const isWorkoutDay = selectedDays.includes(day);
          const dayPlan = planDays[day];

          const workoutType = isWorkoutDay && dayPlan?.workoutType ? dayPlan.workoutType : 'Rest';
          const durationMinutes = isWorkoutDay ? (dayPlan?.durationMinutes || 45) : null;
          const workoutId = (isWorkoutDay && dayPlan?.workoutId && typeof dayPlan.workoutId === 'string' && dayPlan.workoutId.trim() !== '')
            ? dayPlan.workoutId
            : null;

          const dayPayload = {
            planId,
            dayOfWeek: day as DayOfWeek,
            workoutType,
            workoutId,
            durationMinutes,
          };

          const insertedDay = await saveIndividualTrainerWorkoutPlanDay(dayPayload);

          if (!insertedDay || !insertedDay.planDayId) {
            console.error(`[ReviewTrainerPlanScreen] [Table 2] FAILED: Could not save day ${day} in individual_trainer_workout_plan_days!`);
            throw new Error(`Failed to create workout day record for ${day} in individual_trainer_workout_plan_days`);
          }

          // 4. Save exercises for this day into individual_trainer_workout_plan_day_exercises
          if (isWorkoutDay && dayPlan?.exercises && dayPlan.exercises.length > 0) {

            for (let idx = 0; idx < dayPlan.exercises.length; idx++) {
              const ex = dayPlan.exercises[idx];
              const sanitizedVideoId = (ex.workoutVideoId && typeof ex.workoutVideoId === 'string' && ex.workoutVideoId.trim() !== '')
                ? ex.workoutVideoId
                : null;

              const exercisePayload = {
                planDayId: insertedDay.planDayId,
                workoutVideoId: sanitizedVideoId,
                exerciseName: ex.exerciseName || 'Exercise',
                category: ex.category || 'General',
                reps: ex.reps || '10-12 reps',
                order: idx,
                image: ex.image || null,
                videoUrl: ex.videoUrl || null,
              };

              const insertedExercise = await saveIndividualTrainerWorkoutPlanDayExercise(exercisePayload);

              if (!insertedExercise || !insertedExercise.dayExerciseId) {
                console.error(`[ReviewTrainerPlanScreen] [Table 3] FAILED: Could not save exercise ${idx + 1} for ${day}!`, exercisePayload);
                throw new Error(`Failed to save exercise "${ex.exerciseName}" for day ${day} in individual_trainer_workout_plan_day_exercises`);
              }
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['individualTrainerWorkoutPlans'] });
        queryClient.invalidateQueries({ queryKey: ['activeIndividualTrainerWorkoutPlan', customerUserId] });
        queryClient.invalidateQueries({ queryKey: ['trainerWeeklyPlan'] });
        queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlans'] });

        toast.success('Individual Trainer Workout Plan Saved Successfully!');

        router.replace({
          pathname: '/(trainer)/workoutPlan/success' as any,
          params: { workoutsCount: selectedDays.length },
        });
      } else {
        // Regular gym trainer flow (trainer_workout_plans)
        await deactivateTrainerWorkoutPlans(targetUserId);

        const newPlan = await saveTrainerWorkoutPlan({
          userId: targetUserId,
          createdBy: trainerUserId,
          isActive: true,
        });


        if (!newPlan) throw new Error("Failed to create trainer workout plan");

        const planId = newPlan.planId;

        for (const day of ALL_DAYS) {
          const isWorkoutDay = selectedDays.includes(day);
          const dayPlan = planDays[day];

          const workoutType = isWorkoutDay && dayPlan?.workoutType ? dayPlan.workoutType : 'Rest';
          const durationMinutes = isWorkoutDay ? (dayPlan?.durationMinutes || 45) : null;

          const insertedDay = await saveTrainerWorkoutPlanDay({
            planId,
            dayOfWeek: day,
            workoutType,
            workoutId: isWorkoutDay ? dayPlan?.workoutId : null,
            durationMinutes,
          });

          if (!insertedDay) throw new Error(`Failed to create workout day record for ${day}`);

          if (isWorkoutDay && dayPlan?.exercises && dayPlan.exercises.length > 0) {
            for (let idx = 0; idx < dayPlan.exercises.length; idx++) {
              const ex = dayPlan.exercises[idx];
              const exPayload = {
                planDayId: insertedDay.planDayId,
                workoutVideoId: ex.workoutVideoId || null,
                exerciseName: ex.exerciseName,
                category: ex.category,
                reps: ex.reps,
                order: idx,
                image: ex.image || null,
                videoUrl: ex.videoUrl || null,
              };
              await saveTrainerWorkoutPlanDayExercise(exPayload);
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['trainerWeeklyPlan'] });
        queryClient.invalidateQueries({ queryKey: ['trainerWorkoutPlans'] });

        toast.success('Trainer Workout Plan Saved Successfully!');

        router.replace({
          pathname: '/(trainer)/workoutPlan/success' as any,
          params: { workoutsCount: selectedDays.length }
        });
      }
    } catch (error: any) {
      console.error('[ReviewTrainerPlanScreen] CRITICAL ERROR during handleSavePlan:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error,
      });
      toast.error(error?.message || 'Failed to save trainer workout plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const workoutsCount = selectedDays.length;
  const recoveryCount = 7 - workoutsCount;

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28 justify-between">
      <View className="flex-row items-center mb-6">
        <Pressable
          onPress={() => router.push('/(trainer)/workoutPlan/assign-days' as any)}
          className="w-10 h-10 rounded-full border border-[#242424] items-center justify-center bg-[#161616] mr-4 active:opacity-70"
        >
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text className="text-xl font-semibold text-white">Review Plan</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <Text className="text-white text-2xl font-semibold mb-2">Review Customer</Text>
        <Text className="text-white text-2xl font-semibold mb-2">Weekly Plan</Text>
        <Text className="text-[#8E8E8E] text-sm mb-6 leading-5">
          Review the assigned workouts before saving the plan for your customer.
        </Text>

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
                  {hasWorkout && (
                    <View className="w-1.5 h-12 rounded-full bg-[#CCFF00] mr-3" />
                  )}

                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center">
                      <Text className="text-[#8E8E8E] font-semibold text-xs mr-2">{day.substring(0, 3).toUpperCase()}</Text>
                      {hasWorkout && <View className="w-1.5 h-1.5 rounded-full bg-[#CCFF00]" />}
                    </View>
                    <Text className="text-white font-semibold text-base mt-0.5">{workoutTitle}</Text>
                    <Text className="text-[#8E8E8E] text-xs mt-0.5">{workoutSubtitle}</Text>
                  </View>
                </View>

                {hasWorkout ? (
                  <Pressable
                    onPress={() => handleEditDay(day)}
                    className="flex-row items-center border border-[#27272A] bg-[#161616] px-3.5 py-2 rounded-xl active:bg-[#CCFF00]/10"
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
            <Calendar size={20} color="#CCFF00" weight="fill" />
            <Text className="text-white font-semibold text-base ml-2">Weekly Plan Summary</Text>
          </View>

          <View className="flex-row justify-around border-b border-[#27272A]/50 pb-4 mb-4">
            <View className="items-center">
              <Text className="text-[#CCFF00] font-semibold text-3xl">{workoutsCount}</Text>
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
              <Lightbulb size={18} color="#CCFF00" weight="fill" />
            </View>
            <Text className="text-[#8E8E8E] text-xs flex-1 leading-4">
              {workoutsCount >= 3 && workoutsCount <= 5
                ? "Balanced split assigned to customer! Ready to crush their goals 💪"
                : workoutsCount > 5
                  ? "High volume plan assigned! Make sure to remind customer to rest adequately ⚡"
                  : "Light starter plan assigned to customer! 🚀"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleSavePlan}
          disabled={isSubmitting || selectedDays.length === 0}
          className="w-full py-4 bg-[#CCFF00] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90 mt-4 h-14"
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text className="text-black text-base font-semibold">Save Plan for Customer</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
