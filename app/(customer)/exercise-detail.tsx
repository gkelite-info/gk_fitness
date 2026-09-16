import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, Pressable, Image } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Info,
  Play,
  Barbell,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Pause,
  ArrowCounterClockwise,
  Plus,
  Lightbulb,
} from 'phosphor-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '@/lib/supabase';
import { useWorkoutPlanDayById } from '@/hooks/customerWorkouts/useWorkoutPlanDayById';
import { useWorkoutPlanDayExercises } from '@/hooks/customerWorkouts/useWorkoutPlanDayExercises';
import { useLogWorkoutCompletion } from '@/hooks/customerWorkouts/useLogWorkoutCompletion';
import { useSaveSetLog } from '@/hooks/customerWorkouts/useSaveSetLog';
import { useLastSessionWeights } from '@/hooks/customerWorkouts/useWorkoutSetLogs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/context/UserContext';
import { SetRow, WorkoutSetRow, SetType } from '@/components/workout/SetRow';
import { RestTimerWidget } from '@/components/workout/RestTimerWidget';
import { ExerciseInfoSheet } from '@/components/workout/ExerciseInfoSheet';
import { WorkoutCompleteModal } from '@/components/workout/WorkoutCompleteModal';

function buildInitialSets(
  plannedSets: number,
  plannedRepsStr: string,
  lastWeights: { setNumber: number; weight: number; reps: number }[]
): WorkoutSetRow[] {
  const count = Math.max(plannedSets || 3, 1);
  const parsedReps = parseInt((plannedRepsStr || '10').replace(/[^0-9]/g, ''), 10) || 10;

  return Array.from({ length: count }, (_, i) => {
    const setNum = i + 1;
    const prev = lastWeights.find((w) => w.setNumber === setNum);
    return {
      setNumber: setNum,
      setType: 'working' as SetType,
      weight: prev?.weight ?? 0,
      reps: prev?.reps ?? parsedReps,
      isCompleted: false,
    };
  });
}

export default function ExerciseDetail() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ dayId: string; exerciseIndex: string }>();
  const { userId } = useUser();

  const initialIndex = parseInt(params.exerciseIndex || '0');
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useFocusEffect(
    React.useCallback(() => {
      setCurrentIndex(parseInt(params.exerciseIndex || '0'));
    }, [params.exerciseIndex])
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const { data: dayData, isLoading: isLoadingDay } = useWorkoutPlanDayById(params.dayId);
  const { data: eData, isLoading: isLoadingExercises } = useWorkoutPlanDayExercises(params.dayId);

  const exercises = React.useMemo(() => {
    return eData ? [...eData].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : [];
  }, [eData]);

  const isLoading = isLoadingDay || isLoadingExercises;

  // Per-exercise sets state — keyed by dayExerciseId
  const [setsMap, setSetsMap] = useState<Record<string, WorkoutSetRow[]>>({});

  const currentExercise = exercises[currentIndex];
  const nextExercise = currentIndex < exercises.length - 1 ? exercises[currentIndex + 1] : null;
  const total = exercises.length || 1;

  const sessionDate = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  // Fetch last session weights for current exercise
  const { data: lastWeights } = useLastSessionWeights(
    userId,
    currentExercise?.dayExerciseId,
    sessionDate
  );

  // Initialize sets for current exercise
  useEffect(() => {
    if (!currentExercise) return;
    const key = currentExercise.dayExerciseId;
    if (setsMap[key]) return;
    const rows = buildInitialSets(
      currentExercise.sets ?? 3,
      currentExercise.reps ?? '10',
      lastWeights ?? []
    );
    setSetsMap((prev) => ({ ...prev, [key]: rows }));
  }, [currentExercise, lastWeights, setsMap]);

  const currentSets: WorkoutSetRow[] = currentExercise
    ? setsMap[currentExercise.dayExerciseId] ?? []
    : [];

  const updateSets = useCallback(
    (newSets: WorkoutSetRow[]) => {
      if (!currentExercise) return;
      setSetsMap((prev) => ({ ...prev, [currentExercise.dayExerciseId]: newSets }));
    },
    [currentExercise]
  );

  // Rest timer ref
  const startRestTimerRef = useRef<(() => void) | null>(null);

  const { mutateAsync: saveSetLog } = useSaveSetLog();
  const { mutateAsync: logWorkout } = useLogWorkoutCompletion();

  const handleSetChange = useCallback(
    (updated: WorkoutSetRow) => {
      updateSets(currentSets.map((s) => (s.setNumber === updated.setNumber ? updated : s)));
    },
    [currentSets, updateSets]
  );

  const handleSetComplete = useCallback(
    async (updated: WorkoutSetRow) => {
      updateSets(currentSets.map((s) => (s.setNumber === updated.setNumber ? updated : s)));

      if (updated.isCompleted && currentExercise) {
        startRestTimerRef.current?.();

        try {
          await saveSetLog({
            dayExerciseId: currentExercise.dayExerciseId,
            planDayId: params.dayId,
            sessionDate,
            setNumber: updated.setNumber,
            setType: updated.setType,
            weight: updated.weight,
            reps: updated.reps,
            isCompleted: true,
            completedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error('[ExerciseDetail] saveSetLog error:', err);
        }
      }
    },
    [currentSets, updateSets, currentExercise, params.dayId, sessionDate, saveSetLog]
  );

  const handleDuplicate = useCallback(
    (setNum: number) => {
      const src = currentSets.find((s) => s.setNumber === setNum);
      if (!src) return;
      const newSets = [...currentSets, { ...src, setNumber: currentSets.length + 1, isCompleted: false }];
      updateSets(newSets);
    },
    [currentSets, updateSets]
  );

  const handleDelete = useCallback(
    (setNum: number) => {
      const filtered = currentSets
        .filter((s) => s.setNumber !== setNum)
        .map((s, i) => ({ ...s, setNumber: i + 1 }));
      updateSets(filtered);
    },
    [currentSets, updateSets]
  );

  const handleAddSet = useCallback(() => {
    const last = currentSets[currentSets.length - 1];
    const newSet: WorkoutSetRow = {
      setNumber: currentSets.length + 1,
      setType: last?.setType ?? 'working',
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 10,
      isCompleted: false,
    };
    updateSets([...currentSets, newSet]);
  }, [currentSets, updateSets]);

  // Finish Workout Flow
  const handleFinishWorkout = async () => {
    setIsFinishing(true);
    try {
      await logWorkout({
        planDayId: params.dayId,
        durationMinutes: dayData?.durationMinutes || 50,
      });
    } catch (err) {
      console.error('[ExerciseDetail] logWorkout error:', err);
    } finally {
      setIsFinishing(false);
      setShowCompleteModal(true);
    }
  };

  // Navigation
  const handleNext = async () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      await handleFinishWorkout();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const totalSetsLoggedCount = React.useMemo(() => {
    return Object.values(setsMap)
      .flatMap((sets) => sets)
      .filter((s) => s.isCompleted).length;
  }, [setsMap]);

  const workoutType = (dayData?.workoutType || 'WORKOUT SESSION').toUpperCase();
  const title = currentExercise?.exerciseName || currentExercise?.name || 'Exercise';
  const plannedSets = currentExercise?.sets ?? 3;
  const plannedReps = (currentExercise?.reps || '10').replace(/[^0-9-]/g, '') || '10';
  const category = currentExercise?.category || dayData?.workoutType || 'Exercise';
  const imageUri =
    currentExercise?.imageUrl ||
    currentExercise?.image?.uri ||
    currentExercise?.image ||
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop';

  const localVideoSource = React.useMemo(() => {
    if (!currentExercise?.videoUrl) return null;
    const isAbsolute =
      currentExercise.videoUrl.startsWith('http://') ||
      currentExercise.videoUrl.startsWith('https://');
    return isAbsolute
      ? currentExercise.videoUrl
      : supabase.storage.from('workout-videos').getPublicUrl(currentExercise.videoUrl).data.publicUrl;
  }, [currentExercise]);

  const player = useVideoPlayer(localVideoSource, (p) => {
    p.loop = true;
    if (isPlaying) p.play();
  });

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
    setIsPlaying(!isPlaying);
  };

  const startOver = () => {
    if (!player) return;
    player.currentTime = 0;
    player.play();
    setIsPlaying(true);
  };

  const isGif = currentExercise?.videoUrl?.toLowerCase().endsWith('.gif') || false;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0A', paddingTop: 52, paddingHorizontal: 16 }}>
        <View style={{ height: 40, backgroundColor: '#18181B', borderRadius: 12, marginBottom: 24 }} />
        <View style={{ flex: 1, backgroundColor: '#18181B', borderRadius: 16 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      {/* ── Top Header ── */}
      <View className="flex-row items-center justify-between px-4 mb-4 mt-6 bg-transparent">
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(customer)/workout-session', params: { dayId: params.dayId } })
          }
          className="p-2"
        >
          <ArrowLeft size={24} color="#FFF" />
        </Pressable>
        <View className="items-center flex-1">
          <Text className="text-white text-base font-semibold tracking-widest uppercase mb-1">
            {workoutType}
          </Text>
          <Text className="text-[#C4EF00] text-xs font-semibold">
            Exercise {currentIndex + 1} of {total}
          </Text>
        </View>
        <Pressable
          onPress={handleFinishWorkout}
          disabled={isFinishing}
          className="px-3 py-1.5 bg-[#1E1E1E] rounded-xl border border-[#2A2A2A]"
        >
          <Text className="text-[#C4EF00] text-xs font-bold">
            {isFinishing ? '...' : 'Finish'}
          </Text>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View className="flex-row px-4 gap-x-2 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${i === currentIndex ? 'bg-[#C4EF00]' : i < currentIndex ? 'bg-[#C4EF00]/50' : 'bg-[#262626]'}`}
          />
        ))}
      </View>

      <ScrollView
        className="flex-1 px-4 mb-24"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Exercise Card with Video Header ── */}
        <View className="bg-[#18181B] rounded-2xl p-4 border border-[#262626] mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white text-2xl font-semibold flex-1 mr-2">{title}</Text>
            <Pressable
              onPress={() => setShowInfo(true)}
              className="w-9 h-9 rounded-full bg-[#262626] items-center justify-center border border-[#333]"
            >
              <Info size={18} color="#8E8E8E" />
            </Pressable>
          </View>

          <View className="flex-row items-center mb-4">
            <Barbell size={16} color="#C4EF00" weight="fill" />
            <Text className="text-[#8E8E8E] text-xs ml-2">
              Targets: {category}
            </Text>
          </View>

          {/* Video Container */}
          <View className={`relative w-full rounded-xl overflow-hidden bg-black items-center justify-center ${localVideoSource ? 'h-96' : 'h-52'}`}>
            {localVideoSource ? (
              isGif ? (
                <Image
                  source={{ uri: localVideoSource }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <VideoView
                    player={player}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                    nativeControls={false}
                  />
                  <View className="absolute bottom-4 right-4 flex-row gap-x-3">
                    <Pressable
                      onPress={startOver}
                      className="w-12 h-12 rounded-full bg-black/60 items-center justify-center border border-white/20 active:bg-black/80"
                    >
                      <ArrowCounterClockwise size={24} color="#FFF" />
                    </Pressable>
                    <Pressable
                      onPress={togglePlayPause}
                      className="w-12 h-12 rounded-full bg-black/60 items-center justify-center border border-white/20 active:bg-black/80"
                    >
                      {isPlaying ? (
                        <Pause size={24} color="#FFF" weight="fill" />
                      ) : (
                        <Play size={24} color="#FFF" weight="fill" />
                      )}
                    </Pressable>
                  </View>
                </>
              )
            ) : (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: '100%', height: '100%', opacity: 0.6 }}
                  resizeMode="cover"
                />
                <View className="absolute w-16 h-16 rounded-full bg-[#C4EF00] items-center justify-center pl-1">
                  <Play size={32} color="black" weight="fill" />
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Rest Timer Bar ── */}
        <View style={{ marginBottom: 16 }}>
          <RestTimerWidget startRef={startRestTimerRef} />
        </View>

        {/* ── Column Headers ── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 }}>
          <Text style={{ width: 36, color: '#555', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>SET</Text>
          <Text style={{ flex: 1, color: '#555', fontSize: 11, fontWeight: '700', textAlign: 'center', marginHorizontal: 6 }}>WEIGHT (KG)</Text>
          <Text style={{ flex: 1, color: '#555', fontSize: 11, fontWeight: '700', textAlign: 'center', marginHorizontal: 6 }}>REPS</Text>
          <View style={{ width: 76 }} />
        </View>

        {/* ── Set Rows ── */}
        {currentSets.map((set) => (
          <SetRow
            key={set.setNumber}
            set={set}
            onChange={handleSetChange}
            onComplete={handleSetComplete}
            onDuplicate={() => handleDuplicate(set.setNumber)}
            onDelete={() => handleDelete(set.setNumber)}
          />
        ))}

        {/* ── Add Set Button ── */}
        <Pressable
          onPress={handleAddSet}
          className="bg-[#1E1E1E] rounded-2xl py-3.5 items-center justify-center flex-row gap-2 mt-2 mb-5 border border-[#2A2A2A]"
        >
          <Plus size={18} color="#8E8E8E" />
          <Text className="text-[#8E8E8E] font-semibold text-[15px]">Add Set</Text>
        </Pressable>

        {/* ── Form Tips Card ── */}
        <View className="bg-[#161616] rounded-2xl border border-[#262626] p-3.5 flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-full bg-[#1A1F00] items-center justify-center mr-3">
            <Lightbulb size={20} color="#C4EF00" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-white text-[13px] font-semibold mb-0.5">Form Tip</Text>
            <Text className="text-[#8E8E8E] text-xs">Focus on full range of motion & controlled eccentric phase.</Text>
          </View>
        </View>

        {/* ── Up Next Card ── */}
        {nextExercise && (
          <Pressable
            onPress={handleNext}
            className="bg-[#161616] rounded-2xl border border-[#262626] p-3 flex-row items-center mb-2"
          >
            <View className="w-12 h-12 rounded-xl bg-[#1A1F00] items-center justify-center mr-3.5">
              <Barbell size={24} color="#C4EF00" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-[#C4EF00] text-[10px] font-bold tracking-[1.2px] mb-0.5">UP NEXT</Text>
              <Text className="text-white text-sm font-semibold">{nextExercise.exerciseName || nextExercise.name}</Text>
              <Text className="text-[#8E8E8E] text-xs mt-0.5">
                {nextExercise.sets ?? 3} sets · {(nextExercise.reps || '10').replace(/[^0-9-]/g, '')} reps
              </Text>
            </View>
            <CaretRight size={16} color="#8E8E8E" />
          </Pressable>
        )}
      </ScrollView>

      {/* ── Bottom Nav Bar ── */}
      <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-[#0A0A0A] flex-row items-center justify-between border-t border-[#18181B]">
        <Pressable
          onPress={handlePrev}
          disabled={currentIndex === 0}
          className={`w-12 h-12 rounded-xl items-center justify-center border border-[#262626] ${currentIndex === 0 ? 'bg-[#121212] opacity-50' : 'bg-[#18181B]'}`}
        >
          <CaretLeft size={24} color="#FFF" />
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={isFinishing}
          className="flex-1 mx-4 h-14 bg-[#C4EF00] rounded-xl flex-row items-center justify-center active:opacity-80 gap-2"
        >
          <Text className="text-black font-semibold text-base tracking-widest">
            {isFinishing
              ? 'SAVING WORKOUT...'
              : currentIndex === total - 1
              ? 'FINISH WORKOUT'
              : 'FINISH EXERCISE'}
          </Text>
          <CheckCircle size={22} color="#000" weight="fill" />
        </Pressable>

        <Pressable
          onPress={handleNext}
          disabled={currentIndex === total - 1}
          className={`w-12 h-12 rounded-xl items-center justify-center border border-[#262626] ${currentIndex === total - 1 ? 'bg-[#121212] opacity-50' : 'bg-[#18181B]'}`}
        >
          <CaretRight size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* ── Exercise Info Bottom Sheet ── */}
      <ExerciseInfoSheet
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        exerciseName={title}
        category={category}
        plannedSets={plannedSets}
        plannedReps={plannedReps}
      />

      {/* ── Workout Complete Celebration Modal ── */}
      <WorkoutCompleteModal
        visible={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          router.push({ pathname: '/(customer)/workout-session', params: { dayId: params.dayId } });
        }}
        workoutTitle={dayData?.workoutType || 'Workout Session'}
        totalExercises={total}
        totalSetsLogged={totalSetsLoggedCount}
        durationMinutes={dayData?.durationMinutes || 50}
      />
    </View>
  );
}


