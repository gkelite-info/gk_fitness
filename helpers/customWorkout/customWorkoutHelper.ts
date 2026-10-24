import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import {
  EquipmentValue,
  GeneratedExercise,
  MuscleValue,
} from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import {
  saveCustomerWorkoutPlan,
} from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { saveWorkoutPlanDay } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { saveWorkoutPlanDayExercise } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';

// Mapping between custom workout builder muscle groups and GK Fitness workouts.workoutType
export const MUSCLE_TO_WORKOUT_TYPES: Record<MuscleValue, string[]> = {
  CHEST: ['chest'],
  BACK: ['back'],
  SHOULDERS: ['shoulder'],
  BICEPS: ['biceps', 'arms'],
  TRICEPS: ['triceps', 'tricep', 'arms'],
  FOREARMS: ['forearms', 'arms'],
  ABDOMINALS: ['abs'],
  OBLIQUES: ['abs'],
  QUADRICEPS: ['legs'],
  HAMSTRINGS: ['legs'],
  GLUTES: ['legs', 'hips'],
  CALVES: ['calves', 'legs'],
  TRAPS: ['trapezius', 'back'],
};

// Built-in library of exercises mapped to workouts and equipment for fallback & initial seeding
const FALLBACK_EXERCISE_LIBRARY: Record<MuscleValue, Array<{ name: string; equipment: EquipmentValue[]; sets: number; reps: string }>> = {
  CHEST: [
    { name: 'Barbell Bench Press', equipment: ['BARBELL', 'BENCH'], sets: 3, reps: '8-12' },
    { name: 'Incline Dumbbell Press', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Flat Dumbbell Press', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Cable Crossover', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Incline Cable Fly', equipment: ['CABLE', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Machine Chest Press', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Pec Deck Fly', equipment: ['MACHINE'], sets: 3, reps: '12-15' },
    { name: 'Dumbbell Chest Fly', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Push-ups', equipment: ['BODY_ONLY'], sets: 3, reps: '15-20' },
    { name: 'Decline Push-ups', equipment: ['BODY_ONLY', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Chest Press', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Fly', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Kettlebell Floor Press', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Plate Pinch Press', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '12-15' },
  ],
  BACK: [
    { name: 'Lat Pulldown', equipment: ['CABLE', 'MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Seated Cable Row', equipment: ['CABLE'], sets: 3, reps: '10-12' },
    { name: 'Machine Seated Row', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Straight Arm Cable Pulldown', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Wide Grip Pull-up', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '6-10' },
    { name: 'Chin-up', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '6-10' },
    { name: 'Barbell Bent-Over Row', equipment: ['BARBELL'], sets: 3, reps: '8-12' },
    { name: 'Single-Arm Dumbbell Row', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Inverted Row', equipment: ['BODY_ONLY'], sets: 3, reps: '10-12' },
    { name: 'Resistance Band Lat Pulldown', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Seated Row', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Kettlebell Gorilla Row', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Weighted Plate Row', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '12-15' },
  ],
  SHOULDERS: [
    { name: 'Cable Lateral Raise', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Cable Face Pull', equipment: ['CABLE'], sets: 3, reps: '15-20' },
    { name: 'Machine Shoulder Press', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Reverse Pec Deck (Rear Delts)', equipment: ['MACHINE'], sets: 3, reps: '12-15' },
    { name: 'Overhead Barbell Press', equipment: ['BARBELL'], sets: 3, reps: '8-10' },
    { name: 'Seated Dumbbell Shoulder Press', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Dumbbell Lateral Raise', equipment: ['DUMBBELL'], sets: 3, reps: '12-15' },
    { name: 'Dumbbell Front Raise', equipment: ['DUMBBELL'], sets: 3, reps: '12-15' },
    { name: 'Pike Push-ups', equipment: ['BODY_ONLY'], sets: 3, reps: '10-12' },
    { name: 'Resistance Band Overhead Press', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Face Pull', equipment: ['BANDS'], sets: 3, reps: '15-20' },
    { name: 'Kettlebell Overhead Press', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Plate Front Raise', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '12-15' },
  ],
  BICEPS: [
    { name: 'Cable Bicep Curl', equipment: ['CABLE'], sets: 3, reps: '10-12' },
    { name: 'Cable Hammer Curl (Rope)', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Preacher Curl Machine', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Standing Barbell Curl', equipment: ['BARBELL'], sets: 3, reps: '8-12' },
    { name: 'Standing Dumbbell Curl', equipment: ['DUMBBELL'], sets: 3, reps: '10-12' },
    { name: 'Incline Dumbbell Curl', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Dumbbell Hammer Curl', equipment: ['DUMBBELL'], sets: 3, reps: '10-12' },
    { name: 'Resistance Band Bicep Curl', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Kettlebell Bicep Curl', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Plate Bicep Curl', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '12-15' },
    { name: 'Bodyweight Bicep Chin-up', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '6-10' },
  ],
  TRICEPS: [
    { name: 'Cable Tricep Pushdown (Rope)', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Cable Overhead Tricep Extension', equipment: ['CABLE'], sets: 3, reps: '10-12' },
    { name: 'Machine Tricep Dip', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Barbell Skull Crusher', equipment: ['BARBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Overhead Dumbbell Tricep Extension', equipment: ['DUMBBELL'], sets: 3, reps: '10-12' },
    { name: 'Dumbbell Kickback', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Bench Dips', equipment: ['BODY_ONLY', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Diamond Push-ups', equipment: ['BODY_ONLY'], sets: 3, reps: '10-15' },
    { name: 'Resistance Band Tricep Pushdown', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Close-Grip Barbell Bench Press', equipment: ['BARBELL', 'BENCH'], sets: 3, reps: '8-10' },
    { name: 'Kettlebell Overhead Tricep Extension', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
  ],
  TRAPS: [
    { name: 'Cable Upright Row', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Smith Machine Shrug', equipment: ['MACHINE'], sets: 3, reps: '12-15' },
    { name: 'Barbell Shrug', equipment: ['BARBELL'], sets: 3, reps: '12-15' },
    { name: 'Dumbbell Shrug', equipment: ['DUMBBELL'], sets: 3, reps: '12-15' },
    { name: 'Kettlebell High Pull', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Plate Shrug', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '15-20' },
    { name: 'Resistance Band Shrug', equipment: ['BANDS'], sets: 3, reps: '15-20' },
  ],
  FOREARMS: [
    { name: 'Cable Wrist Curl', equipment: ['CABLE'], sets: 3, reps: '15-20' },
    { name: 'Dumbbell Wrist Curl', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '15-20' },
    { name: 'Reverse Barbell Curl', equipment: ['BARBELL'], sets: 3, reps: '10-12' },
    { name: 'Dead Hang', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '30-45s' },
    { name: 'Farmer Walk', equipment: ['DUMBBELL', 'KETTLEBELLS'], sets: 3, reps: '40-60s' },
    { name: 'Plate Pinch Hold', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '30-45s' },
  ],
  ABDOMINALS: [
    { name: 'Kneeling Cable Crunch', equipment: ['CABLE'], sets: 3, reps: '15-20' },
    { name: 'Machine Abdominal Crunch', equipment: ['MACHINE'], sets: 3, reps: '15-20' },
    { name: 'Hanging Knee Raise', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '12-15' },
    { name: 'Floor Crunches', equipment: ['BODY_ONLY'], sets: 3, reps: '20-25' },
    { name: 'Plank', equipment: ['BODY_ONLY'], sets: 3, reps: '45-60s' },
    { name: 'Weighted Crunch', equipment: ['WEIGHT_PLATE'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Kneeling Crunch', equipment: ['BANDS'], sets: 3, reps: '15-20' },
    { name: 'Dumbbell Ab Rollout', equipment: ['DUMBBELL', 'BODY_ONLY'], sets: 3, reps: '10-12' },
  ],
  OBLIQUES: [
    { name: 'Cable Woodchopper', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Torso Rotation Machine', equipment: ['MACHINE'], sets: 3, reps: '15-20' },
    { name: 'Side Plank', equipment: ['BODY_ONLY'], sets: 3, reps: '30-45s' },
    { name: 'Russian Twists', equipment: ['BODY_ONLY', 'WEIGHT_PLATE'], sets: 3, reps: '20-30' },
    { name: 'Dumbbell Side Bend', equipment: ['DUMBBELL'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Woodchopper', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Hanging Oblique Knee Raise', equipment: ['PULLUP_BAR', 'BODY_ONLY'], sets: 3, reps: '10-12' },
  ],
  QUADRICEPS: [
    { name: 'Leg Press Machine', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Leg Extension Machine', equipment: ['MACHINE'], sets: 3, reps: '12-15' },
    { name: 'Hack Squat Machine', equipment: ['MACHINE'], sets: 3, reps: '8-10' },
    { name: 'Smith Machine Squat', equipment: ['MACHINE'], sets: 3, reps: '8-10' },
    { name: 'Barbell Back Squat', equipment: ['BARBELL'], sets: 3, reps: '8-10' },
    { name: 'Barbell Front Squat', equipment: ['BARBELL'], sets: 3, reps: '8-10' },
    { name: 'Dumbbell Goblet Squat', equipment: ['DUMBBELL'], sets: 3, reps: '10-12' },
    { name: 'Bulgarian Split Squat', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Bodyweight Air Squat', equipment: ['BODY_ONLY'], sets: 3, reps: '15-20' },
    { name: 'Walking Lunges', equipment: ['BODY_ONLY', 'DUMBBELL'], sets: 3, reps: '12-15' },
    { name: 'Resistance Band Squat', equipment: ['BANDS'], sets: 3, reps: '15-20' },
    { name: 'Kettlebell Goblet Squat', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
  ],
  HAMSTRINGS: [
    { name: 'Lying Leg Curl Machine', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Seated Leg Curl Machine', equipment: ['MACHINE'], sets: 3, reps: '10-12' },
    { name: 'Cable Pull-Through', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Barbell Romanian Deadlift', equipment: ['BARBELL'], sets: 3, reps: '8-10' },
    { name: 'Dumbbell Romanian Deadlift', equipment: ['DUMBBELL'], sets: 3, reps: '10-12' },
    { name: 'Kettlebell Swing', equipment: ['KETTLEBELLS'], sets: 3, reps: '15-20' },
    { name: 'Resistance Band Good Morning', equipment: ['BANDS'], sets: 3, reps: '12-15' },
    { name: 'Glute-Ham Bodyweight Curl', equipment: ['BODY_ONLY'], sets: 3, reps: '8-10' },
  ],
  GLUTES: [
    { name: 'Cable Glute Kickback', equipment: ['CABLE'], sets: 3, reps: '12-15' },
    { name: 'Seated Hip Abduction Machine', equipment: ['MACHINE'], sets: 3, reps: '15-20' },
    { name: 'Barbell Hip Thrust', equipment: ['BARBELL', 'BENCH'], sets: 3, reps: '10-12' },
    { name: 'Dumbbell Hip Thrust', equipment: ['DUMBBELL', 'BENCH'], sets: 3, reps: '12-15' },
    { name: 'Glute Bridge', equipment: ['BODY_ONLY'], sets: 3, reps: '15-20' },
    { name: 'Resistance Band Lateral Walk', equipment: ['BANDS'], sets: 3, reps: '15-20' },
    { name: 'Kettlebell Sumo Deadlift', equipment: ['KETTLEBELLS'], sets: 3, reps: '10-12' },
    { name: 'Step-ups', equipment: ['BENCH', 'DUMBBELL'], sets: 3, reps: '12-15' },
  ],
  CALVES: [
    { name: 'Standing Calf Raise Machine', equipment: ['MACHINE'], sets: 3, reps: '15-20' },
    { name: 'Seated Calf Raise Machine', equipment: ['MACHINE'], sets: 3, reps: '15-20' },
    { name: 'Standing Barbell Calf Raise', equipment: ['BARBELL'], sets: 3, reps: '15-20' },
    { name: 'Standing Dumbbell Calf Raise', equipment: ['DUMBBELL'], sets: 3, reps: '15-20' },
    { name: 'Seated Plate Calf Raise', equipment: ['WEIGHT_PLATE', 'BENCH'], sets: 3, reps: '15-20' },
    { name: 'Single-Leg Bodyweight Calf Raise', equipment: ['BODY_ONLY'], sets: 3, reps: '15-20' },
    { name: 'Resistance Band Calf Press', equipment: ['BANDS'], sets: 3, reps: '20-25' },
  ],
};

function matchesEquipment(name: string, eqList: string[] | undefined, selectedEquipment: EquipmentValue[]): boolean {
  if (selectedEquipment.length === 0) return true;

  // 1. If video has equipment array tag in DB, check overlap
  if (Array.isArray(eqList) && eqList.length > 0) {
    const hasOverlap = eqList.some(e => selectedEquipment.includes(e as EquipmentValue));
    if (hasOverlap) return true;
  }

  // 2. Keyword heuristic on exercise name
  const lower = name.toLowerCase();
  for (const eq of selectedEquipment) {
    if (eq === 'CABLE' && (lower.includes('cable') || lower.includes('pulldown') || lower.includes('pushdown') || lower.includes('crossover') || lower.includes('rope') || lower.includes('face pull'))) return true;
    if (eq === 'MACHINE' && (lower.includes('machine') || lower.includes('press machine') || lower.includes('leg press') || lower.includes('pec deck') || lower.includes('smith') || lower.includes('hack squat') || lower.includes('extension') || lower.includes('curl machine') || lower.includes('calf raise machine') || lower.includes('seated row machine') || lower.includes('abduction'))) return true;
    if (eq === 'DUMBBELL' && (lower.includes('dumbbell') || lower.includes('db'))) return true;
    if (eq === 'BARBELL' && (lower.includes('barbell') || lower.includes('bb'))) return true;
    if (eq === 'KETTLEBELLS' && (lower.includes('kettlebell') || lower.includes('kb'))) return true;
    if (eq === 'BANDS' && (lower.includes('band') || lower.includes('resistance'))) return true;
    if (eq === 'WEIGHT_PLATE' && (lower.includes('plate') || lower.includes('weighted'))) return true;
    if (eq === 'PULLUP_BAR' && (lower.includes('pull-up') || lower.includes('chin-up') || lower.includes('pullup') || lower.includes('chinup') || lower.includes('hanging'))) return true;
    if (eq === 'BENCH' && lower.includes('bench')) return true;
    if (eq === 'BODY_ONLY') {
      const usesWeights = lower.includes('dumbbell') || lower.includes('barbell') || lower.includes('kettlebell') || lower.includes('band') || lower.includes('cable') || lower.includes('machine');
      if (!usesWeights) return true;
    }
  }

  return false;
}

interface GetCustomExercisesParams {
  muscles: MuscleValue[];
  equipment: EquipmentValue[];
  limit?: number;
  excludeIds?: string[];
  gender?: string;
}

/**
 * Fetch exercises from existing workout_videos & workouts tables in Supabase,
 * matching selected muscle groups and available equipment, prioritizing the user's gender.
 */
export async function getCustomExercises({
  muscles,
  equipment,
  limit = 3,
  excludeIds = [],
  gender,
}: GetCustomExercisesParams): Promise<GeneratedExercise[]> {
  const result: GeneratedExercise[] = [];
  const selectedExIds = new Set<string>(excludeIds);
  const preferredRole = (gender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';

  // Only attempt RPC if gender is not specified (since RPC lacks role filtering)
  if (!gender) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_custom_workout_videos', {
        p_muscles: muscles,
        p_equipment: equipment,
        p_limit: limit,
        p_exclude: excludeIds,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((row: any, i: number) => ({
          exercise_id: row.workoutVideoId || row.workout_video_id || row.exercise_id,
          workoutVideoId: row.workoutVideoId || row.workout_video_id,
          exercise_name: row.exerciseName || row.exercise_name || row.name,
          exerciseName: row.exerciseName || row.exercise_name || row.name,
          category: row.category || row.workoutType || 'General',
          description: null,
          default_sets: row.defaultSets || row.default_sets || 3,
          default_reps: row.defaultReps || row.default_reps || '10-12',
          video_url: row.videoUrl || row.video_url || null,
          videoUrl: row.videoUrl || row.video_url || null,
          image_url: null,
          difficulty: row.difficulty || 'intermediate',
          is_primary_muscle: true,
          muscle_group: row.muscle || muscles[0] || 'GENERAL',
          sort_order: i,
        }));
      }
    } catch (rpcErr) {
      console.warn('[getCustomExercises] RPC not available or failed, falling back to direct table query:', rpcErr);
    }
  }

  // Direct table query: Query workout_videos joined with workouts:workoutId(role)
  for (const muscle of muscles) {
    const workoutTypes = MUSCLE_TO_WORKOUT_TYPES[muscle] || [];

    // Query workout_videos
    let query = supabase
      .from('workout_videos')
      .select(`
        workoutVideoId,
        workoutId,
        exerciseName,
        videoUrl,
        equipment,
        primaryMuscle,
        difficulty,
        defaultSets,
        defaultReps,
        workouts:workoutId (
          workoutType,
          role
        )
      `)
      .eq('is_deleted', false);

    // Try filtering by primaryMuscle column if it exists
    query = query.or(`primaryMuscle.eq.${muscle},primaryMuscle.is.null`);

    const { data: videos, error } = await query.limit(60);

    let candidates: any[] = [];

    if (!error && videos && videos.length > 0) {
      // Filter candidates in JS
      candidates = videos.filter((v: any) => {
        if (selectedExIds.has(v.workoutVideoId)) return false;

        // Check muscle match: either primaryMuscle matches, or workoutType in workouts table matches
        const primaryMatch = v.primaryMuscle === muscle;
        const wType = (v.workouts?.workoutType || '').toLowerCase();
        const typeMatch = workoutTypes.some(t => wType.includes(t));

        if (!primaryMatch && !typeMatch) return false;

        // Check equipment match
        return matchesEquipment(v.exerciseName || '', v.equipment, equipment);
      });
    }

    // Prioritize candidates matching user's gender
    const exactGenderMatches: any[] = [];
    const neutralMatches: any[] = [];
    const otherMatches: any[] = [];

    for (const v of candidates) {
      const vRole = (v.workouts?.role || '').toLowerCase().trim();
      if (vRole === preferredRole) {
        exactGenderMatches.push(v);
      } else if (!vRole || vRole === 'all') {
        neutralMatches.push(v);
      } else {
        otherMatches.push(v);
      }
    }

    // Pick prioritizing preferredRole first, then neutral, then fallback
    const prioritized = [
      ...exactGenderMatches.sort(() => 0.5 - Math.random()),
      ...neutralMatches.sort(() => 0.5 - Math.random()),
      ...otherMatches.sort(() => 0.5 - Math.random()),
    ];
    const picked = prioritized.slice(0, limit);

    for (const v of picked) {
      selectedExIds.add(v.workoutVideoId);
      result.push({
        exercise_id: v.workoutVideoId,
        workoutVideoId: v.workoutVideoId,
        exercise_name: v.exerciseName,
        exerciseName: v.exerciseName,
        category: v.workouts?.workoutType || muscle,
        description: null,
        default_sets: v.defaultSets || 3,
        default_reps: v.defaultReps || '10-12',
        video_url: v.videoUrl || null,
        videoUrl: v.videoUrl || null,
        image_url: null,
        difficulty: v.difficulty || 'intermediate',
        is_primary_muscle: true,
        muscle_group: muscle,
        sort_order: result.length,
      });
    }

    // If still need exercises for this muscle group, pull from fallback library
    const needed = limit - picked.length;
    if (needed > 0) {
      const fallbackList = FALLBACK_EXERCISE_LIBRARY[muscle] || [];
      const matchingFallbacks = fallbackList.filter(f =>
        f.equipment.some(e => equipment.includes(e)) &&
        !Array.from(selectedExIds).some(id => id.includes(f.name))
      );

      const pickedFallbacks = matchingFallbacks
        .sort(() => 0.5 - Math.random())
        .slice(0, needed);

      for (const f of pickedFallbacks) {
        // Try finding a video matching preferredRole for this fallback exercise
        let fVideoId: string | null = null;
        let fVideoUrl: string | null = null;

        try {
          const { data: matchedVids } = await supabase
            .from('workout_videos')
            .select('workoutVideoId, videoUrl, workouts:workoutId(role)')
            .ilike('exerciseName', `%${f.name}%`)
            .eq('is_deleted', false)
            .limit(10);

          if (matchedVids && matchedVids.length > 0) {
            const match = matchedVids.find((mv: any) => mv.workouts?.role?.toLowerCase() === preferredRole) ||
                          matchedVids.find((mv: any) => !mv.workouts?.role || mv.workouts?.role?.toLowerCase() === 'all') ||
                          matchedVids[0];
            fVideoId = match.workoutVideoId;
            fVideoUrl = match.videoUrl;
          }
        } catch {
          // ignore lookup error
        }

        const syntheticId = fVideoId || `fallback-${muscle.toLowerCase()}-${Crypto.randomUUID().slice(0, 8)}`;
        selectedExIds.add(syntheticId);
        result.push({
          exercise_id: syntheticId,
          workoutVideoId: syntheticId,
          exercise_name: f.name,
          exerciseName: f.name,
          category: muscle,
          description: null,
          default_sets: f.sets,
          default_reps: f.reps,
          video_url: fVideoUrl,
          videoUrl: fVideoUrl,
          image_url: null,
          difficulty: 'intermediate',
          is_primary_muscle: true,
          muscle_group: muscle,
          sort_order: result.length,
        });
      }
    }
  }

  return result;
}

/**
 * Shuffle/replace a single exercise in the generated list
 */
export async function shuffleCustomExercise({
  exercise,
  selectedEquipment,
  allExerciseIds,
  gender,
}: {
  exercise: GeneratedExercise;
  selectedEquipment: EquipmentValue[];
  allExerciseIds: string[];
  gender?: string;
}): Promise<GeneratedExercise | null> {
  const muscle = (exercise.muscle_group as MuscleValue) || 'CHEST';

  const candidates = await getCustomExercises({
    muscles: [muscle],
    equipment: selectedEquipment,
    limit: 5,
    excludeIds: allExerciseIds,
    gender,
  });

  const available = candidates.filter(c => !allExerciseIds.includes(c.exercise_id));
  if (available.length > 0) {
    return {
      ...available[0],
      sort_order: exercise.sort_order,
    };
  }

  // Pick an alternative from fallback library
  const fallbackList = (FALLBACK_EXERCISE_LIBRARY[muscle] || []).filter(
    f => f.equipment.some(e => selectedEquipment.includes(e)) && f.name !== exercise.exercise_name
  );

  if (fallbackList.length > 0) {
    const picked = fallbackList[Math.floor(Math.random() * fallbackList.length)];
    const preferredRole = (gender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';
    let fVideoId: string | null = null;
    let fVideoUrl: string | null = null;

    try {
      const { data: matchedVids } = await supabase
        .from('workout_videos')
        .select('workoutVideoId, videoUrl, workouts:workoutId(role)')
        .ilike('exerciseName', `%${picked.name}%`)
        .eq('is_deleted', false)
        .limit(10);

      if (matchedVids && matchedVids.length > 0) {
        const match = matchedVids.find((mv: any) => mv.workouts?.role?.toLowerCase() === preferredRole) ||
                      matchedVids.find((mv: any) => !mv.workouts?.role || mv.workouts?.role?.toLowerCase() === 'all') ||
                      matchedVids[0];
        fVideoId = match.workoutVideoId;
        fVideoUrl = match.videoUrl;
      }
    } catch {
      // ignore lookup error
    }

    return {
      exercise_id: fVideoId || `fallback-${muscle.toLowerCase()}-${Crypto.randomUUID().slice(0, 8)}`,
      workoutVideoId: fVideoId || undefined,
      exercise_name: picked.name,
      exerciseName: picked.name,
      category: muscle,
      description: null,
      default_sets: picked.sets,
      default_reps: picked.reps,
      video_url: fVideoUrl,
      videoUrl: fVideoUrl,
      image_url: null,
      difficulty: 'intermediate',
      is_primary_muscle: true,
      muscle_group: muscle,
      sort_order: exercise.sort_order,
    };
  }

  return null;
}

interface StartCustomWorkoutSessionParams {
  userId: string;
  selectedEquipment: EquipmentValue[];
  selectedMuscles: MuscleValue[];
  exercises: GeneratedExercise[];
  userGender?: string;
}

/**
 * Persist custom workout session to customer_workout_plans,
 * workout_plan_days, and workout_plan_day_exercises,
 * returning the planDayId for immediate navigation to exercise-detail.
 */
export async function startCustomWorkoutSession({
  userId,
  selectedEquipment,
  selectedMuscles,
  exercises,
  userGender,
}: StartCustomWorkoutSessionParams): Promise<string> {
  const planName = `Custom Workout - ${selectedMuscles.join(', ')}`;

  // 1. Create a dedicated customer_workout_plan record
  // NOTE: isActive is set to false so it NEVER collides with active plans on unq_plan_day_of_week
  const plan = await saveCustomerWorkoutPlan({
    userId,
    isActive: false,
  });

  const planId = (plan as any)?.planId || (plan as any)?.id;
  if (!planId) {
    throw new Error('Failed to create custom workout plan record.');
  }

  // 2. Create the single workout_plan_day
  // dayOfWeek in PostgreSQL enum enum_workout_plan_days_dayOfWeek must be one of:
  // 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  const ALL_DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as const;
  const todayDayOfWeek = ALL_DAYS[new Date().getDay()] || 'Monday';

  const day = await saveWorkoutPlanDay({
    planId: planId,
    dayOfWeek: todayDayOfWeek,
    workoutType: `Custom: ${selectedMuscles.slice(0, 2).join(' & ')}`,
    weekNumber: 1,
  });

  const planDayId = (day as any)?.planDayId || (day as any)?.id;
  if (!planDayId) {
    throw new Error('Failed to create custom workout plan day.');
  }

  const preferredRole = (userGender || 'male').toLowerCase().trim().includes('female') ? 'female' : 'male';

  // 3. Insert each exercise into workout_plan_day_exercises
  let orderIndex = 0;
  for (const ex of exercises) {
    let resolvedVideoId = ex.workoutVideoId || (ex.exercise_id?.startsWith('fallback-') ? null : ex.exercise_id);

    // If fallback, find or link to a real workout_video matching preferredRole if possible
    if (!resolvedVideoId || resolvedVideoId.startsWith('fallback-')) {
      const { data: matchedVideos } = await supabase
        .from('workout_videos')
        .select('workoutVideoId, workouts:workoutId(role)')
        .ilike('exerciseName', `%${ex.exercise_name || (ex as any).exerciseName}%`)
        .eq('is_deleted', false)
        .limit(10);

      if (matchedVideos && matchedVideos.length > 0) {
        const preferred = matchedVideos.find((v: any) => v.workouts?.role?.toLowerCase() === preferredRole);
        resolvedVideoId = preferred?.workoutVideoId || matchedVideos[0]?.workoutVideoId || null;
      }
    }

    // If still null, pick any valid workoutVideoId from the system matching preferredRole so DB foreign key doesn't fail
    if (!resolvedVideoId || resolvedVideoId.startsWith('fallback-')) {
      const { data: anyVideos } = await supabase
        .from('workout_videos')
        .select('workoutVideoId, workouts:workoutId(role)')
        .eq('is_deleted', false)
        .limit(10);

      if (anyVideos && anyVideos.length > 0) {
        const preferred = anyVideos.find((v: any) => v.workouts?.role?.toLowerCase() === preferredRole);
        resolvedVideoId = preferred?.workoutVideoId || anyVideos[0]?.workoutVideoId || '00000000-0000-0000-0000-000000000000';
      }
    }

    await saveWorkoutPlanDayExercise({
      planDayId: planDayId,
      workoutVideoId: resolvedVideoId,
      exerciseName: ex.exercise_name || (ex as any).exerciseName,
      category: ex.muscle_group || selectedMuscles[0] || 'Strength',
      sets: ex.default_sets || 3,
      reps: ex.default_reps || '10-12',
      order: orderIndex++,
      image: ex.video_url || ex.videoUrl || null,
    });
  }

  return planDayId;
}
