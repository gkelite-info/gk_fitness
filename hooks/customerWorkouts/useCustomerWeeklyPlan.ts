import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDays } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises, enrichExercisesWithVideos } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

const CANONICAL_DAYS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function normalizeDayKey(dayOfWeek?: string | null): string {
  if (!dayOfWeek || typeof dayOfWeek !== 'string') return '';
  const trimmed = dayOfWeek.trim();
  return CANONICAL_DAYS[trimmed.toLowerCase()] || trimmed;
}

export function useCustomerWeeklyPlan(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['customerWeeklyPlan', userId],
    queryFn: async () => {
      if (!userId) return null;

      const plans = await fetchCustomerWorkoutPlans(userId);
      const activePlan = plans?.find((p: any) => p.isActive) ?? plans?.[0];

      if (!activePlan) return null;

      const days = await fetchWorkoutPlanDays(activePlan.planId);
      const loadedPlanDays: any = { 1: {}, 2: {}, 3: {}, 4: {} };

      const activeDays = (days || []).filter(
        (d: any) => d.workoutType && String(d.workoutType).trim().toLowerCase() !== 'rest'
      );

      if (activeDays.length === 0) {
        return loadedPlanDays;
      }

      const activePlanDayIds = activeDays.map((d: any) => d.planDayId).filter(Boolean);
      const exercisesByDayId = new Map<string, any[]>();

      // Batch-fetch all exercises for the plan in a single query instead of 28 parallel queries
      if (activePlanDayIds.length > 0) {
        try {
          const { data: batchRows, error: batchError } = await supabase
            .from('workout_plan_day_exercises')
            .select('*, workout_videos:workoutVideoId(videoUrl)')
            .in('planDayId', activePlanDayIds)
            .is('deletedAt', null)
            .order('order', { ascending: true });

          let rawRows = batchRows;
          if (batchError) {
            const { data: simpleRows, error: simpleError } = await supabase
              .from('workout_plan_day_exercises')
              .select('*')
              .in('planDayId', activePlanDayIds)
              .is('deletedAt', null)
              .order('order', { ascending: true });
            if (!simpleError) {
              rawRows = simpleRows;
            }
          }

          if (rawRows && rawRows.length > 0) {
            const enrichedAll = await enrichExercisesWithVideos(rawRows);
            for (const ex of enrichedAll) {
              if (!ex?.planDayId) continue;
              if (!exercisesByDayId.has(ex.planDayId)) {
                exercisesByDayId.set(ex.planDayId, []);
              }
              exercisesByDayId.get(ex.planDayId)!.push(ex);
            }
          }
        } catch (batchErr) {
          console.warn('[useCustomerWeeklyPlan] Batch exercise fetch fallback:', batchErr);
        }
      }

      // Only fall back to per-day helper (which handles auto-seeding) for days missing from the batch
      const missingDays = activeDays.filter((d: any) => !exercisesByDayId.has(d.planDayId));
      if (missingDays.length > 0) {
        await Promise.all(
          missingDays.map(async (d: any) => {
            try {
              const exs = await fetchWorkoutPlanDayExercises(d.planDayId);
              exercisesByDayId.set(d.planDayId, exs || []);
            } catch (dayErr) {
              console.warn(`[useCustomerWeeklyPlan] Day ${d.planDayId} exercise fetch error:`, dayErr);
              exercisesByDayId.set(d.planDayId, []);
            }
          })
        );
      }

      for (const d of activeDays) {
        const weekNum = Number(d.weekNumber) || 1;
        if (!loadedPlanDays[weekNum]) {
          loadedPlanDays[weekNum] = {};
        }
        const dayKey = normalizeDayKey(d.dayOfWeek);
        if (!dayKey) continue;

        loadedPlanDays[weekNum][dayKey] = {
          dayOfWeek: dayKey,
          workoutType: d.workoutType,
          workoutId: d.workoutId || null,
          durationMinutes: d.durationMinutes,
          exercises: exercisesByDayId.get(d.planDayId) || [],
          planDayId: d.planDayId,
        };
      }

      return loadedPlanDays;
    },
    enabled: !!userId,
  });
}
