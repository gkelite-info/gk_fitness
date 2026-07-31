import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import { CaretLeft, Trash, MagnifyingGlass, Plus, Clock, Barbell } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { fetchCustomerWorkoutPlans } from '@/helpers/customerWorkoutPlans/customerWorkoutPlans';
import { fetchWorkoutPlanDayById, fetchWorkoutPlanDays, saveWorkoutPlanDay } from '@/helpers/customerWorkoutPlans/workoutPlansDays';
import { fetchWorkoutPlanDayExercises, saveWorkoutPlanDayExercise, deleteWorkoutPlanDayExercise } from '@/helpers/customerWorkoutPlans/workoutPlanDayExercises';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from '@/lib/toast';

const ADDITIONAL_EXERCISES = [
  { id: 'add_1', name: 'Dumbbell Chest Press', category: 'Chest', image: require('../../../assets/workout.png') },
  { id: 'add_2', name: 'Decline Bench Press', category: 'Chest', image: require('../../../assets/chest-stood.png') },
];

export default function EditWorkoutDay() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const { userId } = useUser();
  const [dayInfo, setDayInfo] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [deletedExerciseIds, setDeletedExerciseIds] = useState<string[]>([]);
  const [currentPlanDayId, setCurrentPlanDayId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ index: number, ex: any } | null>(null);
  const [restModalVisible, setRestModalVisible] = useState(false);
  const [isMakingRest, setIsMakingRest] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!userId || !day) return;
      setIsLoading(true);
      try {
        let planDayId = day;
        let dayStr = day;
        let dayData: any = null;

        const isUUID = day.includes('-');

        if (isUUID) {
          dayData = await fetchWorkoutPlanDayById(day);
          if (dayData) dayStr = dayData.dayOfWeek;
        } else {
          const plans = await fetchCustomerWorkoutPlans(userId);
          const activePlan = plans.find((p: any) => p.isActive);
          if (activePlan) {
            const days = await fetchWorkoutPlanDays(activePlan.planId);
            dayData = days.find((d: any) => d.dayOfWeek.toLowerCase() === day.toLowerCase());
            if (dayData) planDayId = dayData.planDayId;
          }
        }

        if (dayData && dayData.planDayId) {
          setCurrentPlanDayId(dayData.planDayId);
          const fetchedExercises = await fetchWorkoutPlanDayExercises(dayData.planDayId);
          setExercises(fetchedExercises);
        } else {
          setExercises([]);
        }

        const current = new Date();
        const currentDayOfWeek = current.getDay();
        const diff = current.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
        const monday = new Date(current.setDate(diff));

        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayIndex = dayOrder.indexOf(dayStr.toLowerCase());
        const targetDate = new Date(monday);
        if (dayIndex !== -1) {
          targetDate.setDate(monday.getDate() + dayIndex);
        }

        setDayInfo({
          name: dayStr.charAt(0).toUpperCase() + dayStr.slice(1),
          abbr: dayStr.substring(0, 3).toUpperCase(),
          dateStr: targetDate.getDate().toString().padStart(2, '0'),
          type: dayData && dayData.workoutType !== 'Rest' ? dayData.workoutType : 'Rest Day',
          duration: dayData?.durationMinutes || 0
        });

      } catch (error) {
        console.error('Error fetching edit day data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [day, userId]);

  const handleAddExercise = (ex: any) => {
    if (exercises.some(e => e.exerciseName === ex.name)) return;

    setExercises(prev => [...prev, {
      exerciseName: ex.name,
      category: ex.category,
      reps: '10 - 12 reps',
      order: prev.length + 1,
      image: null,
      isNew: true
    }]);
  };

  const openDeleteModal = (index: number, ex: any) => {
    setExerciseToDelete({ index, ex });
    setDeleteModalVisible(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      const { index, ex } = exerciseToDelete;
      if (ex.dayExerciseId) {
        setDeletedExerciseIds(prev => [...prev, ex.dayExerciseId]);
      }
      const newExs = [...exercises];
      newExs.splice(index, 1);
      setExercises(newExs);
    }
    setDeleteModalVisible(false);
    setExerciseToDelete(null);
  };

  const handleSave = async () => {
    if (!currentPlanDayId) {
      return;
    }

    setIsSaving(true);
    try {
      for (const id of deletedExerciseIds) {
        await deleteWorkoutPlanDayExercise(id);
      }

      const newExs = exercises.filter(ex => ex.isNew);
      for (const ex of newExs) {
        await saveWorkoutPlanDayExercise({
          planDayId: currentPlanDayId,
          exerciseName: ex.exerciseName,
          category: ex.category,
          reps: ex.reps,
          order: ex.order,
        });
      }

      setDeletedExerciseIds([]);
      const fetchedExercises = await fetchWorkoutPlanDayExercises(currentPlanDayId);
      setExercises(fetchedExercises);

      toast.success('Exercises saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving exercises:', error);
      toast.error('Failed to save exercises.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMakeRestDay = async () => {
    if (!currentPlanDayId || !dayInfo) return;
    setRestModalVisible(false);
    setIsMakingRest(true);
    try {
      for (const ex of exercises) {
        if (ex.dayExerciseId) {
          await deleteWorkoutPlanDayExercise(ex.dayExerciseId);
        }
      }

      const dayData = await fetchWorkoutPlanDayById(currentPlanDayId);
      if (dayData) {
        await saveWorkoutPlanDay({
          planDayId: currentPlanDayId,
          planId: dayData.planId,
          dayOfWeek: dayData.dayOfWeek,
          workoutType: 'Rest',
          durationMinutes: 0
        });
      }

      toast.success('Day marked as Rest Day!');
      router.back();
    } catch (error) {
      console.error('Error making rest day:', error);
      toast.error('Failed to make rest day.');
    } finally {
      setIsMakingRest(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A] px-5 pt-12 pb-28">
      <View className="flex-row items-center mb-8">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-[#111111] border border-[#242424] rounded-full items-center justify-center mr-4"
        >
          <CaretLeft size={20} color="#fff" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-xl font-semibold">Customize {dayInfo?.name || 'Workout'}</Text>
          <Text className="text-[#8E8E8E] text-xs mt-1">
            Edit your exercises for <Text className="text-[#D7FF00] text-xs">{dayInfo?.type || 'the day'}.</Text>
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {isLoading ? (
          <View className="items-center justify-center pt-20">
            <ActivityIndicator size="large" color="#D7FF00" />
          </View>
        ) : (
          <>
            <View className="flex-row bg-[#111111] border border-[#242424] rounded-3xl p-4 items-center mb-8">
              <View className="w-[70px] h-[85px] rounded-2xl bg-[#D7FF00] items-center justify-center mr-5">
                <Text className="text-black text-xs font-semibold tracking-wider mb-1">{dayInfo?.abbr}</Text>
                <Text className="text-black text-3xl font-black">{dayInfo?.dateStr}</Text>
              </View>
              <View className="flex-1 justify-center">
                <Text className="text-white text-xl font-semibold mb-2">{dayInfo?.type}</Text>
                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center">
                    <View className="mr-1.5">
                      <Barbell size={14} color="#8E8E8E" weight="fill" />
                    </View>
                    <Text className="text-[#8E8E8E] text-xs font-medium">{exercises.length} Exs</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="mr-1.5">
                      <Clock size={14} color="#8E8E8E" weight="fill" />
                    </View>
                    <Text className="text-[#8E8E8E] text-xs font-medium">{dayInfo?.duration} Min</Text>
                  </View>
                </View>
              </View>
            </View>

            <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-widest mb-4 uppercase">
              Selected Exercises ({exercises.length})
            </Text>

            <View className="gap-3 mb-8">
              {exercises.length === 0 ? (
                <Text className="text-[#8E8E8E] text-sm text-center py-5">No exercises added for this day yet.</Text>
              ) : (
                exercises.map((ex, index) => (
                  <View
                    key={ex.dayExerciseId || index.toString()}
                    className="flex-row bg-[#111111] border border-[#242424] rounded-2xl p-4 items-center"
                  >
                    <View className="w-6 items-center mr-2">
                      <Text className="text-[#D7FF00] text-[11px] font-semibold">{index + 1}</Text>
                    </View>
                    <View className="flex-1 pr-2">
                      <Text className="text-white text-base font-semibold mb-1">{ex.exerciseName}</Text>
                      <Text className="text-[#8E8E8E] text-[10px]">{ex.category}</Text>
                    </View>
                    <View className="items-end mr-4">
                      <Text className="text-[#D7FF00] text-[11px] font-semibold mb-1">{ex.reps}</Text>
                    </View>
                    <Pressable onPress={() => openDeleteModal(index, ex)} className="p-1">
                      <Trash size={20} color="#FF453A" />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <Text className="text-[#D7FF00] text-[11px] font-semibold tracking-widest mb-4 uppercase">
              Add More Exercises
            </Text>

            <View className="flex-row bg-[#111111] border border-[#242424] rounded-2xl px-4 py-3.5 items-center mb-6">
              <MagnifyingGlass size={18} color="#8E8E8E" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor="#8E8E8E"
                className="flex-1 ml-3 text-white text-sm"
              />
            </View>

            <View className="flex-row gap-4">
              {ADDITIONAL_EXERCISES
                .filter(ex =>
                  !exercises.some(e => e.exerciseName === ex.name) &&
                  ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((ex) => (
                  <View
                    key={ex.id}
                    className="flex-1 bg-[#111111] border border-[#242424] rounded-3xl overflow-hidden"
                  >
                    <Image
                      source={ex.image}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                    <View className="p-4">
                      <Text numberOfLines={1} className="text-white text-sm font-semibold mb-1">{ex.name}</Text>
                      <Text className="text-[#8E8E8E] text-[10px] mb-4">{ex.category}</Text>
                      <Pressable
                        onPress={() => handleAddExercise(ex)}
                        className="w-8 h-8 bg-[#D7FF00] rounded-full items-center justify-center self-end active:opacity-70"
                      >
                        <Plus size={16} color="#000" weight="bold" />
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>

            <View className="mt-8 mb-4">
              <Pressable
                onPress={handleSave}
                disabled={isSaving || (!exercises.some(e => e.isNew) && deletedExerciseIds.length === 0)}
                className={`w-full py-4 rounded-2xl items-center justify-center ${isSaving || (!exercises.some(e => e.isNew) && deletedExerciseIds.length === 0)
                  ? 'bg-[#D7FF00]/50'
                  : 'bg-[#D7FF00] active:opacity-80'
                  }`}
              >
                {isSaving ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Text className="text-black font-semibold text-base">Save Changes</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setRestModalVisible(true)}
                disabled={isMakingRest || dayInfo?.type === 'Rest Day'}
                className={`w-full py-4 mt-3 rounded-2xl items-center justify-center border border-[#333] ${isMakingRest || dayInfo?.type === 'Rest Day'
                  ? 'opacity-50'
                  : 'active:opacity-70 bg-[#161616]'
                  }`}
              >
                {isMakingRest ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">Make Rest Day</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Remove Exercise?"
        description={`Are you sure you want to delete ${exerciseToDelete?.ex?.exerciseName}?`}
        onConfirm={confirmDeleteExercise}
        onClose={() => {
          setDeleteModalVisible(false);
          setExerciseToDelete(null);
        }}
        confirmText="Remove"
        confirmButtonColor="bg-red-500"
        icon={<Trash size={32} color="#EF4444" weight="fill" />}
      />
      <ConfirmModal
        visible={restModalVisible}
        title="Make Rest Day"
        description="Are you sure you want to make this a rest day? All exercises for this day will be removed."
        onConfirm={handleMakeRestDay}
        onClose={() => setRestModalVisible(false)}
        confirmText="Confirm"
      />
    </View>
  );
}
