-- =============================================================================
-- GK FITNESS — CUSTOM WORKOUT MODULE DATABASE ENHANCEMENT
-- =============================================================================
-- This migration enhances the EXISTING workout schema (workouts, workout_videos,
-- workout_plan_days, workout_plan_day_exercises, customer_workout_logs,
-- customer_workout_set_logs) to support the interactive Custom Workout Builder.
-- Run this script in the Supabase SQL Editor.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Add equipment & muscle metadata columns to `workout_videos`
-- ─────────────────────────────────────────────────────────────────────────────
-- Safe ALTER TABLE statements (if already added, this is a no-op):

ALTER TABLE public.workout_videos
  ADD COLUMN IF NOT EXISTS equipment          TEXT[] DEFAULT ARRAY['BODY_ONLY']::TEXT[],
  ADD COLUMN IF NOT EXISTS "primaryMuscle"    TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryMuscles" TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS difficulty         TEXT DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS "defaultSets"      INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "defaultReps"      TEXT DEFAULT '10-12';

COMMENT ON COLUMN public.workout_videos.equipment IS 'List of equipment required for this exercise (e.g. DUMBBELL, BARBELL, BENCH, BODY_ONLY)';
COMMENT ON COLUMN public.workout_videos."primaryMuscle" IS 'Target muscle group (e.g. CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, LEGS, ABS)';
COMMENT ON COLUMN public.workout_videos."secondaryMuscles" IS 'Secondary supporting muscles engaged by this exercise';


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Scalability Indexes (GIN for array queries & B-tree for foreign keys)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workout_videos_equipment 
  ON public.workout_videos USING GIN (equipment);

CREATE INDEX IF NOT EXISTS idx_workout_videos_secondary_muscles 
  ON public.workout_videos USING GIN ("secondaryMuscles");

CREATE INDEX IF NOT EXISTS idx_workout_videos_primary_muscle 
  ON public.workout_videos USING btree ("primaryMuscle");

CREATE INDEX IF NOT EXISTS idx_workout_plan_days_plan_id 
  ON public.workout_plan_days ("planId");

CREATE INDEX IF NOT EXISTS idx_workout_plan_day_exercises_plan_day 
  ON public.workout_plan_day_exercises ("planDayId");

CREATE INDEX IF NOT EXISTS idx_customer_workout_set_logs_user_day 
  ON public.customer_workout_set_logs ("userId", "planDayId");

CREATE INDEX IF NOT EXISTS idx_customer_workout_logs_user_day 
  ON public.customer_workout_logs ("userId", "planDayId");


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Auto-tag existing `workout_videos`
-- ─────────────────────────────────────────────────────────────────────────────
-- Cast w."workoutType"::text explicitly because workoutType is an enum (enum_workouts_workoutType)

-- 3.1 Tag primaryMuscle from joined workouts.workoutType
UPDATE public.workout_videos wv
SET "primaryMuscle" = CASE
  WHEN LOWER(w."workoutType"::text) LIKE '%chest%' THEN 'CHEST'
  WHEN LOWER(w."workoutType"::text) LIKE '%back%' THEN 'BACK'
  WHEN LOWER(w."workoutType"::text) LIKE '%shoulder%' THEN 'SHOULDERS'
  WHEN LOWER(w."workoutType"::text) LIKE '%bicep%' THEN 'BICEPS'
  WHEN LOWER(w."workoutType"::text) LIKE '%tricep%' THEN 'TRICEPS'
  WHEN LOWER(w."workoutType"::text) LIKE '%forearm%' THEN 'FOREARMS'
  WHEN LOWER(w."workoutType"::text) LIKE '%ab%' OR LOWER(w."workoutType"::text) LIKE '%core%' THEN 'ABDOMINALS'
  WHEN LOWER(w."workoutType"::text) LIKE '%leg%' THEN 'QUADRICEPS'
  WHEN LOWER(w."workoutType"::text) LIKE '%calv%' THEN 'CALVES'
  WHEN LOWER(w."workoutType"::text) LIKE '%trap%' THEN 'TRAPS'
  ELSE 'CHEST'
END
FROM public.workouts w
WHERE wv."workoutId" = w."workoutId"
  AND (wv."primaryMuscle" IS NULL OR wv."primaryMuscle" = '');

-- 3.2 Tag equipment based on keywords in exerciseName
UPDATE public.workout_videos
SET equipment = CASE
  -- Cable Machine
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%cable%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%pulldown%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%pushdown%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%crossover%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%rope%'
    THEN ARRAY['CABLE']::TEXT[]
  -- Gym Machine
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%machine%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%leg press%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%pec deck%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%smith%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%hack squat%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%extension%'
    OR LOWER(COALESCE("exerciseName", '')) LIKE '%abduction%'
    THEN ARRAY['MACHINE']::TEXT[]
  -- Dumbbell + Bench
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%dumbbell%bench%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%incline%dumbbell%'
    THEN ARRAY['DUMBBELL', 'BENCH']::TEXT[]
  -- Barbell + Bench
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%barbell%bench%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%bench press%'
    THEN ARRAY['BARBELL', 'BENCH']::TEXT[]
  -- Dumbbell only
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%dumbbell%' OR LOWER(COALESCE("exerciseName", '')) LIKE '% db %'
    THEN ARRAY['DUMBBELL']::TEXT[]
  -- Barbell only
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%barbell%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%deadlift%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%squat%'
    THEN ARRAY['BARBELL']::TEXT[]
  -- Kettlebell
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%kettlebell%' OR LOWER(COALESCE("exerciseName", '')) LIKE '% kb %'
    THEN ARRAY['KETTLEBELLS']::TEXT[]
  -- Resistance Band
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%band%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%resistance%'
    THEN ARRAY['BANDS']::TEXT[]
  -- Weight Plate
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%plate%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%pinch%'
    THEN ARRAY['WEIGHT_PLATE']::TEXT[]
  -- Pullup Bar
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%pull-up%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%pullup%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%chin-up%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%hanging%'
    THEN ARRAY['PULLUP_BAR', 'BODY_ONLY']::TEXT[]
  -- Bench
  WHEN LOWER(COALESCE("exerciseName", '')) LIKE '%bench%' OR LOWER(COALESCE("exerciseName", '')) LIKE '%dips%'
    THEN ARRAY['BENCH', 'BODY_ONLY']::TEXT[]
  -- Default Bodyweight
  ELSE ARRAY['BODY_ONLY']::TEXT[]
END
WHERE "exerciseName" IS NOT NULL
  AND (equipment IS NULL OR equipment = ARRAY['BODY_ONLY']::TEXT[]);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: RPC function `get_custom_workout_videos`
-- ─────────────────────────────────────────────────────────────────────────────
-- Fast query matching muscles & equipment with randomization & optional gender/role matching
CREATE OR REPLACE FUNCTION public.get_custom_workout_videos(
  p_muscles   TEXT[],
  p_equipment TEXT[],
  p_limit     INT DEFAULT 3,
  p_exclude   UUID[] DEFAULT '{}'::UUID[],
  p_role      TEXT DEFAULT 'all'
)
RETURNS TABLE (
  workout_video_id UUID,
  workout_id       UUID,
  exercise_name    CHARACTER VARYING(255),
  video_url        CHARACTER VARYING(255),
  category         TEXT,
  muscle           TEXT,
  equipment        TEXT[],
  default_sets     INTEGER,
  default_reps     TEXT,
  difficulty       TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  _muscle TEXT;
BEGIN
  FOREACH _muscle IN ARRAY p_muscles LOOP
    RETURN QUERY
    SELECT 
      wv."workoutVideoId"  AS workout_video_id,
      wv."workoutId"       AS workout_id,
      wv."exerciseName"    AS exercise_name,
      wv."videoUrl"        AS video_url,
      COALESCE(w."workoutType"::text, 'General') AS category,
      _muscle              AS muscle,
      wv.equipment         AS equipment,
      COALESCE(wv."defaultSets", 3) AS default_sets,
      COALESCE(wv."defaultReps", '10-12') AS default_reps,
      COALESCE(wv.difficulty, 'intermediate') AS difficulty
    FROM public.workout_videos wv
    JOIN public.workouts w ON w."workoutId" = wv."workoutId"
    WHERE wv.is_deleted = FALSE
      AND (
        wv."primaryMuscle" = _muscle 
        OR LOWER(w."workoutType"::text) = LOWER(_muscle)
        OR (LOWER(_muscle) IN ('quadriceps', 'hamstrings', 'glutes') AND LOWER(w."workoutType"::text) = 'legs')
        OR (LOWER(_muscle) IN ('abdominals', 'obliques') AND LOWER(w."workoutType"::text) = 'abs')
        OR (LOWER(_muscle) = 'traps' AND LOWER(w."workoutType"::text) = 'trapezius')
      )
      AND (
        ARRAY_LENGTH(p_equipment, 1) IS NULL 
        OR wv.equipment && p_equipment
      )
      AND (
        ARRAY_LENGTH(p_exclude, 1) IS NULL 
        OR wv."workoutVideoId" != ALL(p_exclude)
      )
      AND (
        p_role = 'all'
        OR p_role IS NULL
        OR LOWER(w.role::text) = LOWER(p_role)
      )
    ORDER BY random()
    LIMIT p_limit;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_custom_workout_videos(TEXT[], TEXT[], INT, UUID[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_custom_workout_videos(TEXT[], TEXT[], INT, UUID[], TEXT) TO anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Ensure Core Workouts Exist & Seed Essential Exercise Library
-- ─────────────────────────────────────────────────────────────────────────────
-- Note: Cast types explicitly to enum types
DO $$
DECLARE
  types TEXT[] := ARRAY['chest', 'back', 'shoulder', 'biceps', 'triceps', 'forearms', 'abs', 'legs', 'calves', 'trapezius', 'cardio'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY types LOOP
    IF NOT EXISTS (SELECT 1 FROM public.workouts WHERE "workoutType"::text = t AND role::text = 'male' AND is_deleted = FALSE) THEN
      INSERT INTO public.workouts ("workoutId", "workoutType", role, "isStretching", is_deleted, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), t::public."enum_workouts_workoutType", 'male'::public.enum_workouts_role, FALSE, FALSE, NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- Seed core library exercises into `workout_videos` if not already present
-- (Uses valid videoUrl since videoUrl is NOT NULL)
INSERT INTO public.workout_videos (
  "workoutVideoId", 
  "workoutId", 
  "videoUrl",
  "exerciseName", 
  equipment, 
  "primaryMuscle", 
  "defaultSets", 
  "defaultReps", 
  difficulty, 
  is_deleted, 
  "createdAt", 
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  w."workoutId",
  seed.video_url,
  seed.name,
  seed.equipment,
  seed.primary_muscle,
  seed.sets,
  seed.reps,
  seed.difficulty,
  FALSE,
  NOW(),
  NOW()
FROM (
  VALUES
    -- Chest
    ('Barbell Bench Press', 'chest', 'workout-videos/placeholder.mp4', ARRAY['BARBELL', 'BENCH']::TEXT[], 'CHEST', 3, '8-12', 'intermediate'),
    ('Incline Dumbbell Press', 'chest', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'CHEST', 3, '10-12', 'intermediate'),
    ('Cable Crossover', 'chest', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'CHEST', 3, '12-15', 'intermediate'),
    ('Machine Chest Press', 'chest', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'CHEST', 3, '10-12', 'beginner'),
    ('Pec Deck Fly', 'chest', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'CHEST', 3, '12-15', 'beginner'),
    ('Push-ups', 'chest', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'CHEST', 3, '15-20', 'beginner'),
    ('Dumbbell Chest Fly', 'chest', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'CHEST', 3, '12-15', 'beginner'),
    ('Resistance Band Chest Press', 'chest', 'workout-videos/placeholder.mp4', ARRAY['BANDS']::TEXT[], 'CHEST', 3, '12-15', 'beginner'),

    -- Back
    ('Lat Pulldown', 'back', 'workout-videos/placeholder.mp4', ARRAY['CABLE', 'MACHINE']::TEXT[], 'BACK', 3, '10-12', 'beginner'),
    ('Seated Cable Row', 'back', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'BACK', 3, '10-12', 'intermediate'),
    ('Machine Seated Row', 'back', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'BACK', 3, '10-12', 'beginner'),
    ('Wide Grip Pull-up', 'back', 'workout-videos/placeholder.mp4', ARRAY['PULLUP_BAR', 'BODY_ONLY']::TEXT[], 'BACK', 3, '6-10', 'advanced'),
    ('Barbell Bent-Over Row', 'back', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'BACK', 3, '8-12', 'intermediate'),
    ('Single-Arm Dumbbell Row', 'back', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'BACK', 3, '10-12', 'beginner'),
    ('Inverted Row', 'back', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'BACK', 3, '10-12', 'beginner'),
    ('Resistance Band Lat Pulldown', 'back', 'workout-videos/placeholder.mp4', ARRAY['BANDS']::TEXT[], 'BACK', 3, '12-15', 'beginner'),

    -- Shoulders
    ('Cable Lateral Raise', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'SHOULDERS', 3, '12-15', 'intermediate'),
    ('Cable Face Pull', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'SHOULDERS', 3, '15-20', 'beginner'),
    ('Machine Shoulder Press', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'SHOULDERS', 3, '10-12', 'beginner'),
    ('Overhead Barbell Press', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'SHOULDERS', 3, '8-10', 'intermediate'),
    ('Seated Dumbbell Shoulder Press', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'SHOULDERS', 3, '10-12', 'intermediate'),
    ('Dumbbell Lateral Raise', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'SHOULDERS', 3, '12-15', 'beginner'),
    ('Pike Push-ups', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'SHOULDERS', 3, '10-12', 'intermediate'),
    ('Resistance Band Face Pull', 'shoulder', 'workout-videos/placeholder.mp4', ARRAY['BANDS']::TEXT[], 'SHOULDERS', 3, '15-20', 'beginner'),

    -- Biceps
    ('Cable Bicep Curl', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'BICEPS', 3, '10-12', 'beginner'),
    ('Preacher Curl Machine', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'BICEPS', 3, '10-12', 'beginner'),
    ('Standing Barbell Curl', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'BICEPS', 3, '8-12', 'intermediate'),
    ('Standing Dumbbell Curl', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'BICEPS', 3, '10-12', 'beginner'),
    ('Dumbbell Hammer Curl', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'BICEPS', 3, '10-12', 'beginner'),
    ('Resistance Band Bicep Curl', 'biceps', 'workout-videos/placeholder.mp4', ARRAY['BANDS']::TEXT[], 'BICEPS', 3, '12-15', 'beginner'),

    -- Triceps
    ('Cable Tricep Pushdown', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'TRICEPS', 3, '12-15', 'beginner'),
    ('Cable Overhead Extension', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'TRICEPS', 3, '10-12', 'intermediate'),
    ('Machine Tricep Dip', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'TRICEPS', 3, '10-12', 'intermediate'),
    ('Barbell Skull Crusher', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['BARBELL', 'BENCH']::TEXT[], 'TRICEPS', 3, '10-12', 'intermediate'),
    ('Overhead Dumbbell Tricep Extension', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'TRICEPS', 3, '10-12', 'beginner'),
    ('Bench Dips', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY', 'BENCH']::TEXT[], 'TRICEPS', 3, '12-15', 'beginner'),
    ('Diamond Push-ups', 'triceps', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'TRICEPS', 3, '10-15', 'intermediate'),

    -- Legs
    ('Leg Press Machine', 'legs', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'QUADRICEPS', 3, '10-12', 'beginner'),
    ('Leg Extension Machine', 'legs', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'QUADRICEPS', 3, '12-15', 'beginner'),
    ('Lying Leg Curl Machine', 'legs', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'HAMSTRINGS', 3, '10-12', 'beginner'),
    ('Seated Hip Abduction Machine', 'legs', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'GLUTES', 3, '15-20', 'beginner'),
    ('Barbell Back Squat', 'legs', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'QUADRICEPS', 3, '8-10', 'intermediate'),
    ('Dumbbell Goblet Squat', 'legs', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'QUADRICEPS', 3, '10-12', 'beginner'),
    ('Barbell Romanian Deadlift', 'legs', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'HAMSTRINGS', 3, '8-10', 'intermediate'),
    ('Bulgarian Split Squat', 'legs', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'QUADRICEPS', 3, '10-12', 'intermediate'),
    ('Barbell Hip Thrust', 'legs', 'workout-videos/placeholder.mp4', ARRAY['BARBELL', 'BENCH']::TEXT[], 'GLUTES', 3, '10-12', 'intermediate'),
    ('Bodyweight Air Squats', 'legs', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'QUADRICEPS', 3, '15-20', 'beginner'),

    -- Abs
    ('Kneeling Cable Crunch', 'abs', 'workout-videos/placeholder.mp4', ARRAY['CABLE']::TEXT[], 'ABDOMINALS', 3, '15-20', 'intermediate'),
    ('Machine Abdominal Crunch', 'abs', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'ABDOMINALS', 3, '15-20', 'beginner'),
    ('Hanging Knee Raise', 'abs', 'workout-videos/placeholder.mp4', ARRAY['PULLUP_BAR', 'BODY_ONLY']::TEXT[], 'ABDOMINALS', 3, '12-15', 'intermediate'),
    ('Floor Crunches', 'abs', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'ABDOMINALS', 3, '20-25', 'beginner'),
    ('Standard Plank', 'abs', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'ABDOMINALS', 3, '45-60s', 'beginner'),
    ('Side Plank', 'abs', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'OBLIQUES', 3, '30-45s', 'beginner'),
    ('Russian Twists', 'abs', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY', 'WEIGHT_PLATE']::TEXT[], 'OBLIQUES', 3, '20-30', 'beginner'),

    -- Calves
    ('Standing Calf Raise Machine', 'calves', 'workout-videos/placeholder.mp4', ARRAY['MACHINE']::TEXT[], 'CALVES', 3, '15-20', 'beginner'),
    ('Standing Barbell Calf Raise', 'calves', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'CALVES', 3, '15-20', 'intermediate'),
    ('Standing Dumbbell Calf Raise', 'calves', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL']::TEXT[], 'CALVES', 3, '15-20', 'beginner'),
    ('Single-Leg Bodyweight Calf Raise', 'calves', 'workout-videos/placeholder.mp4', ARRAY['BODY_ONLY']::TEXT[], 'CALVES', 3, '15-20', 'beginner'),

    -- Traps & Forearms
    ('Barbell Shrug', 'trapezius', 'workout-videos/placeholder.mp4', ARRAY['BARBELL']::TEXT[], 'TRAPS', 3, '12-15', 'beginner'),
    ('Dumbbell Wrist Curl', 'forearms', 'workout-videos/placeholder.mp4', ARRAY['DUMBBELL', 'BENCH']::TEXT[], 'FOREARMS', 3, '15-20', 'beginner'),
    ('Dead Hang', 'forearms', 'workout-videos/placeholder.mp4', ARRAY['PULLUP_BAR', 'BODY_ONLY']::TEXT[], 'FOREARMS', 3, '30-45s', 'beginner')
) AS seed(name, workout_type, video_url, equipment, primary_muscle, sets, reps, difficulty)
JOIN public.workouts w ON w."workoutType"::text = seed.workout_type AND w.role::text = 'male' AND w.is_deleted = FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM public.workout_videos wv 
  WHERE LOWER(wv."exerciseName") = LOWER(seed.name)
    AND wv.is_deleted = FALSE
);
