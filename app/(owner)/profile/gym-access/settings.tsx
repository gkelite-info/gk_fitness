import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Clock, CaretDown, CheckSquare, Square } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymTimings } from '@/hooks/gymTimings/useGymTimings';
import { bulkSaveGymTimings, SaveGymTimingParams } from '@/helpers/gymTimings/gymTimingsHelper';
import { useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toast } from '@/lib/toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DayState = {
  timingId?: string;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  createdAt?: string;
};

const parseTime = (timeStr: string) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);
  if (h === 12) h = 0;
  if (modifier === 'PM') h += 12;
  const date = new Date();
  date.setHours(h);
  date.setMinutes(parseInt(minutes, 10));
  date.setSeconds(0);
  return date;
};

const formatTime = (date: Date) => {
  let hours = date.getHours();
  let minutes: any = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return (hours < 10 ? '0' + hours : hours) + ':' + minutes + ' ' + ampm;
};

const DaySettingRow = ({
  day,
  isLast,
  state,
  onChange,
  onPressOpenTime,
  onPressCloseTime,
}: {
  day: string;
  isLast: boolean;
  state: DayState;
  onChange: (updates: Partial<DayState>) => void;
  onPressOpenTime: () => void;
  onPressCloseTime: () => void;
}) => {
  return (
    <View className={`py-6 ${!isLast ? 'border-b border-[#1F1F22]' : ''}`}>
      <View className="flex-row items-center justify-between">
        <View className="w-[85px]">
          <Text className="text-white text-[13px] font-medium mb-3">{day}</Text>
          <Pressable
            className="flex-row items-center active:opacity-70"
            onPress={() => onChange({ isClosed: !state.isClosed })}
          >
            {state.isClosed ? (
              <CheckSquare size={16} color="#71717A" weight="fill" style={{ marginRight: 6 }} />
            ) : (
              <Square size={16} color="#3F3F46" weight="regular" style={{ marginRight: 6 }} />
            )}
            <Text className="text-[#A1A1AA] text-xs">Closed</Text>
          </Pressable>
        </View>

        <View className={`flex-1 flex-row justify-between ${state.isClosed ? 'opacity-30' : ''}`}>
          <View className="flex-1 mr-3">
            <Text className="text-[#71717A] text-[10px] mb-2">Opens at</Text>
            <Pressable
              className="flex-row items-center justify-between border border-[#1F1F22] rounded-lg bg-[#0A0A0A] px-3 h-10 active:opacity-70"
              disabled={state.isClosed}
              onPress={onPressOpenTime}
            >
              <Text className="text-white text-xs font-semibold">{state.openTime}</Text>
              <CaretDown size={14} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          <View className="flex-1">
            <Text className="text-[#71717A] text-[10px] mb-2">Closes at</Text>
            <Pressable
              className="flex-row items-center justify-between border border-[#1F1F22] rounded-lg bg-[#0A0A0A] px-3 h-10 active:opacity-70"
              disabled={state.isClosed}
              onPress={onPressCloseTime}
            >
              <Text className="text-white text-xs font-semibold">{state.closeTime}</Text>
              <CaretDown size={14} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function GymAccessSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId, gymId: currentGymId } = useUser();

  const { data: gymTimings, isLoading } = useGymTimings(currentGymId || undefined);

  const [timingsState, setTimingsState] = useState<Record<string, DayState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pickerState, setPickerState] = useState<{ day: string; field: 'openTime' | 'closeTime'; value: Date } | null>(null);

  useEffect(() => {
    const initialState: Record<string, DayState> = {};
    DAYS.forEach(day => {
      const existing = gymTimings?.find((t: any) => t.day === day);
      if (existing) {
        initialState[day] = {
          timingId: existing.timingId,
          isClosed: existing.isClosed,
          openTime: existing.openTime,
          closeTime: existing.closeTime,
          createdAt: existing.createdAt,
        };
      } else {
        initialState[day] = {
          isClosed: false,
          openTime: (day === 'Saturday' || day === 'Sunday') ? '07:00 AM' : '06:00 AM',
          closeTime: day === 'Saturday' ? '09:00 PM' : (day === 'Sunday' ? '01:00 PM' : '10:00 PM'),
        };
      }
    });
    setTimingsState(initialState);
  }, [gymTimings]);

  const handleSave = async () => {
    if (!currentGymId || !userId) {
      toast.error('Missing gym or user information.');
      return;
    }

    const safeGymId = currentGymId;
    const safeUserId = userId;

    setIsSaving(true);
    try {
      const recordsToSave: SaveGymTimingParams[] = Object.keys(timingsState).map(day => {
        const state = timingsState[day];
        return {
          timingId: state.timingId,
          gymId: safeGymId,
          day: day,
          openTime: state.openTime,
          closeTime: state.closeTime,
          isClosed: state.isClosed,
          createdBy: safeUserId,
          createdAt: state.createdAt,
        };
      });

      await bulkSaveGymTimings(recordsToSave);

      await queryClient.invalidateQueries({ queryKey: ['gymTimings', currentGymId] });

      toast.success('Gym access settings saved successfully.');
      router.back();
    } catch (error: any) {
      console.error('[GymAccessSettingsScreen] Error saving settings:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0A0A0A]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center mr-2 active:opacity-70 -ml-2"
        >
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-xl font-semibold text-white tracking-wide">Gym Access Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#A1A1AA] text-[13px] leading-5 mb-6">
          Set gym timings and customer check-in rules.
        </Text>

        <View className="bg-[#161616] border border-[#1F1F22] rounded-3xl p-5 mb-10">
          <View className="flex-row items-start mb-2">
            <Clock size={20} color="#C4EF00" weight="regular" style={{ marginRight: 12, marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-white text-[15px] font-semibold mb-1">Gym Timings</Text>
              <Text className="text-[#A1A1AA] text-xs">Set opening and closing time for each day.</Text>
            </View>
          </View>

          <View className="mt-2">
            {isLoading ? (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator color="#C4EF00" />
              </View>
            ) : (
              DAYS.map((day, index) => {
                const state = timingsState[day];
                if (!state) return null;

                return (
                  <DaySettingRow
                    key={day}
                    day={day}
                    isLast={index === DAYS.length - 1}
                    state={state}
                    onChange={(updates) => {
                      setTimingsState(prev => ({
                        ...prev,
                        [day]: { ...prev[day], ...updates },
                      }));
                    }}
                    onPressOpenTime={() => setPickerState({ day, field: 'openTime', value: parseTime(state.openTime) })}
                    onPressCloseTime={() => setPickerState({ day, field: 'closeTime', value: parseTime(state.closeTime) })}
                  />
                );
              })
            )}
          </View>
        </View>

        <View
          className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#1F1F22] px-5 pt-4 pb-6 flex-row gap-4"
          style={{ paddingBottom: Math.max(insets.bottom + 65, 115) }}
        >
          <Pressable
            className="flex-1 border border-[#27272A] bg-[#121214] py-4 rounded-xl items-center justify-center active:opacity-70"
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text className="text-white font-semibold text-[15px]">Cancel</Text>
          </Pressable>
          <Pressable
            className="flex-1 bg-[#C4EF00] py-4 rounded-xl items-center justify-center active:opacity-80 flex-row"
            onPress={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving && <ActivityIndicator color="#000000" size="small" style={{ marginRight: 8 }} />}
            <Text className="text-[#000000] font-semibold text-[15px]">Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>

      {Platform.OS === 'ios' && pickerState && (
        <Modal transparent animationType="slide" visible={!!pickerState}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-[#121214] rounded-t-3xl pb-8 pt-4">
              <View className="flex-row justify-between items-center px-4 pb-4 border-b border-[#27272A]">
                <Pressable onPress={() => setPickerState(null)} className="px-2">
                  <Text className="text-white text-base">Cancel</Text>
                </Pressable>
                <Text className="text-white font-semibold text-lg">Select Time</Text>
                <Pressable onPress={() => setPickerState(null)} className="px-2">
                  <Text className="text-[#C4EF00] font-semibold text-base">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerState.value}
                mode="time"
                display="spinner"
                themeVariant="dark"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTimingsState(prev => ({
                      ...prev,
                      [pickerState.day]: { ...prev[pickerState.day], [pickerState.field]: formatTime(selectedDate) },
                    }));
                    setPickerState(prev => prev ? { ...prev, value: selectedDate } : null);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && pickerState && (
        <DateTimePicker
          value={pickerState.value}
          mode="time"
          display="default"
          onChange={(event, selectedDate) => {
            if (event.type === 'set' && selectedDate) {
              setTimingsState(prev => ({
                ...prev,
                [pickerState.day]: { ...prev[pickerState.day], [pickerState.field]: formatTime(selectedDate) },
              }));
            }
            setPickerState(null);
          }}
        />
      )}
    </View>
  );
}
