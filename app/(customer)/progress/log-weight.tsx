import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CalendarBlank, CaretDown, CheckCircle } from 'phosphor-react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useUpdateMeasurements } from '@/hooks/fitness/useUpdateProgress';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { fetchCustomerOnboarding } from '@/helpers/onboardingHelper';
import { toast } from '@/lib/toast';

const formatDateDisplay = (date: Date) => {
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();

  return isToday ? `Today, ${monthName} ${day}` : `${monthName} ${day}, ${date.getFullYear()}`;
};

function isSameCalendarDay(timestampStr?: string | null, targetDate?: Date): boolean {
  if (!timestampStr || !targetDate) return false;
  try {
    const cleanStr = String(timestampStr).trim().replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return false;

    // 1. Device local time comparison
    const isLocalMatch =
      d.getFullYear() === targetDate.getFullYear() &&
      d.getMonth() === targetDate.getMonth() &&
      d.getDate() === targetDate.getDate();
    if (isLocalMatch) return true;

    // 2. YYYY-MM-DD prefix comparison (covers ISO string formats)
    const targetYear = targetDate.getFullYear();
    const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
    const targetDay = String(targetDate.getDate()).padStart(2, '0');
    const targetDatePrefix = `${targetYear}-${targetMonth}-${targetDay}`;
    if (cleanStr.startsWith(targetDatePrefix) || d.toISOString().startsWith(targetDatePrefix)) {
      return true;
    }

    // 3. UTC date comparison
    return (
      d.getUTCFullYear() === targetDate.getFullYear() &&
      d.getUTCMonth() === targetDate.getMonth() &&
      d.getUTCDate() === targetDate.getDate()
    );
  } catch {
    return false;
  }
}

export default function LogWeightModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { userId, createdAt: contextCreatedAt } = useUser();
  const { mutateAsync: updateMeasurements, isPending } = useUpdateMeasurements();
  const { data: progressData } = useProgressData(userId || null);

  const currentWeightFromProgress = progressData?.summary?.currentWeight || 0;
  const goalWeight = progressData?.summary?.targetWeight || 0;

  const [latestKnownWeight, setLatestKnownWeight] = useState<number>(0);
  const [hasLoggedForDate, setHasLoggedForDate] = useState<boolean>(false);
  const displayedCurrentWeight = currentWeightFromProgress > 0 ? currentWeightFromProgress : latestKnownWeight;

  const [userCreatedAt, setUserCreatedAt] = useState<Date | null>(() => {
    if (contextCreatedAt) {
      const d = new Date(contextCreatedAt);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });

  const fetchUserCreatedAt = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('createdAt')
        .eq('userId', userId)
        .maybeSingle();

      if (data?.createdAt) {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) {
          setUserCreatedAt(d);
        }
      }
    } catch (err) {
      console.warn('[LogWeight] Failed to fetch user createdAt:', err);
    }
  };

  useEffect(() => {
    fetchUserCreatedAt();
  }, [userId]);

  // Minimum allowed date: start of the user's account creation day
  const minAllowedDate = useMemo(() => {
    if (!userCreatedAt) return undefined;
    const min = new Date(userCreatedAt);
    min.setHours(0, 0, 0, 0);
    return min;
  }, [userCreatedAt]);

  // Maximum allowed date: end of today
  const maxAllowedDate = useMemo(() => {
    const max = new Date();
    max.setHours(23, 59, 59, 999);
    return max;
  }, []);

  const originalDbWeightRef = useRef<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [weightInput, setWeightInput] = useState<string>('0.0');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [tempIosDate, setTempIosDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFetchingWeight, setIsFetchingWeight] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isNotesFocusedRef = useRef(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);

  // Keyboard listener - ONLY apply height when entering notes
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (isNotesFocusedRef.current) {
          const h = e.endCoordinates.height;
          setKeyboardHeight(h);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch weight for the user on the selected date:
  // 1. Check customer_measurements matching createdAt or loggedAt for that date
  // 2. If not found, check customer_onboarding matching createdAt for that date
  // 3. If no record exists for that date in either table, prefill with current/latest weight
  const fetchWeightForDate = async (targetDate: Date) => {
    if (!userId) return;
    setIsFetchingWeight(true);
    try {
      // 1. Check customer_measurements
      const { data: measurements, error: mError } = await supabase
        .from('customer_measurements')
        .select('weight, notes, loggedAt, createdAt')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (mError) {
        console.warn('[LogWeight] Error querying customer_measurements:', mError);
      }

      // Check for latest known weight across all records
      const validM = (measurements || []).filter((m: any) => m.weight != null && Number(m.weight) > 0);
      let latestWeight = validM.length > 0 ? Number(validM[0].weight) : 0;

      const mMatch = (measurements || []).find((m: any) => {
        return isSameCalendarDay(m.createdAt, targetDate) || isSameCalendarDay(m.loggedAt, targetDate);
      });

      if (mMatch && mMatch.weight != null && Number(mMatch.weight) > 0) {
        const val = Number(mMatch.weight);
        setWeight(val);
        setWeightInput(val.toFixed(1));
        originalDbWeightRef.current = val;
        setNotes(mMatch.notes || '');
        setHasLoggedForDate(true);
        if (latestWeight > 0) setLatestKnownWeight(latestWeight);
        return;
      }

      // 2. Check customer_onboarding
      const { data: onboardingRows, error: obError } = await supabase
        .from('customer_onboarding')
        .select('weight, createdAt')
        .eq('createdBy', userId)
        .order('createdAt', { ascending: false });

      if (obError) {
        console.warn('[LogWeight] Error querying customer_onboarding:', obError);
      }

      if (latestWeight === 0 && onboardingRows && onboardingRows.length > 0) {
        const obWithWeight = onboardingRows.find((ob: any) => ob.weight != null && parseFloat(String(ob.weight)) > 0);
        if (obWithWeight) {
          latestWeight = parseFloat(String(obWithWeight.weight));
        }
      }

      const obMatch = (onboardingRows || []).find((ob: any) => {
        return isSameCalendarDay(ob.createdAt, targetDate);
      });

      if (obMatch && obMatch.weight != null) {
        const p = parseFloat(String(obMatch.weight));
        if (!isNaN(p) && p > 0) {
          setWeight(p);
          setWeightInput(p.toFixed(1));
          originalDbWeightRef.current = p;
          setNotes('');
          setHasLoggedForDate(true);
          if (latestWeight > 0) setLatestKnownWeight(latestWeight);
          return;
        }
      }

      // Also check cached/RPC onboarding where createdAt matches targetDate
      try {
        const cachedOb = await fetchCustomerOnboarding(userId);
        if (latestWeight === 0 && cachedOb?.weight) {
          const p = parseFloat(String(cachedOb.weight));
          if (!isNaN(p) && p > 0) latestWeight = p;
        }
        if (cachedOb && cachedOb.weight && isSameCalendarDay(cachedOb.createdAt, targetDate)) {
          const p = parseFloat(String(cachedOb.weight));
          if (!isNaN(p) && p > 0) {
            setWeight(p);
            setWeightInput(p.toFixed(1));
            originalDbWeightRef.current = p;
            setNotes('');
            setHasLoggedForDate(true);
            if (latestWeight > 0) setLatestKnownWeight(latestWeight);
            return;
          }
        }
      } catch (cacheErr) {
        console.warn('[LogWeight] Error checking cached onboarding:', cacheErr);
      }

      if (latestWeight > 0) {
        setLatestKnownWeight(latestWeight);
      }

      // 3. No weight logged or created for this user on the selected date -> prefill with latest or current weight
      setHasLoggedForDate(false);
      const fallback = latestWeight > 0 ? latestWeight : (currentWeightFromProgress > 0 ? currentWeightFromProgress : 0);
      setWeight(fallback);
      setWeightInput(fallback > 0 ? fallback.toFixed(1) : '0.0');
      originalDbWeightRef.current = fallback;
      setNotes('');
    } catch (err) {
      console.error('[LogWeight] Exception in fetchWeightForDate:', err);
      setHasLoggedForDate(false);
      const fallback = currentWeightFromProgress > 0 ? currentWeightFromProgress : 0;
      setWeight(fallback);
      setWeightInput(fallback > 0 ? fallback.toFixed(1) : '0.0');
      originalDbWeightRef.current = fallback;
      setNotes('');
    } finally {
      setIsFetchingWeight(false);
    }
  };

  // Sync with currentWeightFromProgress when it finishes loading if not yet logged for this date
  useEffect(() => {
    if (!hasLoggedForDate && currentWeightFromProgress > 0 && (weight === 0 || weightInput === '0.0')) {
      setWeight(currentWeightFromProgress);
      setWeightInput(currentWeightFromProgress.toFixed(1));
      originalDbWeightRef.current = currentWeightFromProgress;
    }
  }, [currentWeightFromProgress, hasLoggedForDate]);

  // Initial fetch on mount
  useEffect(() => {
    if (userId) {
      fetchWeightForDate(selectedDate);
    }
  }, [userId]);

  const handleDateChange = (date: Date) => {
    let finalDate = date;
    if (minAllowedDate && date < minAllowedDate) {
      toast.error('Cannot select a date prior to your account creation date.');
      finalDate = minAllowedDate;
    }
    setSelectedDate(finalDate);
    fetchWeightForDate(finalDate);
  };

  // Ensure selectedDate is not earlier than account creation date
  useEffect(() => {
    if (minAllowedDate && selectedDate < minAllowedDate) {
      handleDateChange(minAllowedDate);
    }
  }, [minAllowedDate]);

  const handleIncrement = () => {
    setWeight(prev => {
      const next = Number((prev + 0.1).toFixed(1));
      setWeightInput(next.toFixed(1));
      return next;
    });
  };

  const handleDecrement = () => {
    setWeight(prev => {
      const next = Math.max(0, Number((prev - 0.1).toFixed(1)));
      setWeightInput(next.toFixed(1));
      return next;
    });
  };

  const handleWeightFocus = () => {
    isNotesFocusedRef.current = false;
    setIsNotesFocused(false);
    setKeyboardHeight(0);
  };

  const handleWeightChange = (text: string) => {
    // allow digits and a single decimal point (e.g. 45.8)
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setWeightInput(formatted);
  };

  const handleWeightBlur = () => {
    const trimmed = weightInput.trim();

    if (!trimmed) {
      // Revert directly to what the user had earlier or current weight
      const original = originalDbWeightRef.current || displayedCurrentWeight || 0;
      setWeight(original);
      setWeightInput(original > 0 ? original.toFixed(1) : '0.0');
      return;
    }

    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed <= 0) {
      const original = originalDbWeightRef.current || displayedCurrentWeight || 0;
      setWeight(original);
      setWeightInput(original > 0 ? original.toFixed(1) : '0.0');
    } else {
      const formatted = Number(parsed.toFixed(1));
      setWeight(formatted);
      setWeightInput(formatted.toFixed(1));
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    const finalWeight = parseFloat(weightInput);
    const weightToSave = isNaN(finalWeight) || finalWeight < 0 ? weight : Number(finalWeight.toFixed(1));

    if (weightToSave <= 0) {
      toast.error('Please enter a valid weight.');
      return;
    }

    // Construct timestamp with user's chosen date
    const saveDate = new Date(selectedDate);
    const now = new Date();
    saveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const loggedAt = saveDate.toISOString();

    try {
      await updateMeasurements({
        userId: userId,
        measurements: { weight: weightToSave, notes: notes || undefined },
        loggedAt: loggedAt,
      });
      originalDbWeightRef.current = weightToSave;
      setHasLoggedForDate(true);
      toast.success('Weight saved successfully!');
      router.back();
    } catch (e: any) {
      console.error('Save Weight Error:', e);
      const msg = e?.message || 'Failed to save weight. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={isNotesFocused}
      className="flex-1 bg-[#09090B]"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: (isNotesFocused && keyboardHeight > 0) ? keyboardHeight + 50 : insets.bottom + 90,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={isNotesFocused && Platform.OS === 'ios'}
          >
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-white text-[28px] font-semibold tracking-tight">Log Weight</Text>
                <Text className="text-[#8E8E93] text-[13px] mt-0.5">Record and monitor your daily progress</Text>
              </View>
              <Pressable
                className="w-9 h-9 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70 border border-[#2A2A2D]"
                onPress={() => router.back()}
              >
                <X size={18} color="#8E8E93" weight="bold" />
              </Pressable>
            </View>

            <View className="bg-[#1C1C1E] rounded-3xl p-5 mb-6 border border-[#2A2A2D]/50 flex-row justify-between items-center">
              <View>
                <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] uppercase mb-1">
                  Current Weight
                </Text>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-white text-[30px] font-semibold tracking-tight">
                    {displayedCurrentWeight > 0 ? displayedCurrentWeight.toFixed(1) : '0.0'}
                  </Text>
                  <Text className="text-[#8E8E93] text-base font-medium">kg</Text>
                </View>
              </View>

              {goalWeight > 0 && (
                <View className="items-end">
                  <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] uppercase mb-1">
                    Goal Weight
                  </Text>
                  <View className="flex-row items-baseline gap-1.5">
                    <Text className="text-[#D4FF00] text-[26px] font-semibold tracking-tight">
                      {goalWeight.toFixed(1)}
                    </Text>
                    <Text className="text-[#8E8E93] text-sm font-medium">kg</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="bg-[#1C1C1E] rounded-3xl p-6 items-center justify-center mb-8 border border-[#2A2A2D]/50">
              <View className="flex-row items-center justify-between w-full mb-6">
                <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] uppercase">
                  Weight Reading
                </Text>
                <View className={`px-2.5 py-1 rounded-full ${hasLoggedForDate ? 'bg-[#D4FF00]/15' : 'bg-[#2A2A2D]'}`}>
                  <Text className={`text-[11px] font-medium ${hasLoggedForDate ? 'text-[#D4FF00]' : 'text-[#8E8E93]'}`}>
                    {hasLoggedForDate
                      ? 'Recorded for date'
                      : displayedCurrentWeight > 0
                        ? `Current: ${displayedCurrentWeight.toFixed(1)} kg`
                        : 'New entry'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between w-full px-2">
                <Pressable
                  className="w-14 h-14 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
                  onPress={handleDecrement}
                >
                  <Text className="text-white text-3xl font-light leading-none mb-1">-</Text>
                </Pressable>

                <View className="items-center justify-center mx-2">
                  <View className="flex-row items-baseline gap-1 border-b-[3px] border-[#D4FF00] pb-1 px-2">
                    {isFetchingWeight ? (
                      <View className="h-[54px] justify-center items-center px-6">
                        <ActivityIndicator color="#D4FF00" size="small" />
                      </View>
                    ) : (
                      <TextInput
                        value={weightInput}
                        onFocus={handleWeightFocus}
                        onChangeText={handleWeightChange}
                        onBlur={handleWeightBlur}
                        keyboardType="decimal-pad"
                        selectTextOnFocus
                        className="text-[#D4FF00] text-[54px] font-semibold tracking-tight leading-none text-center min-w-[120px] p-0"
                        placeholder="0.0"
                        placeholderTextColor="#D4FF00/50"
                      />
                    )}
                    <Text className="text-white text-2xl font-medium">kg</Text>
                  </View>
                </View>

                <Pressable
                  className="w-14 h-14 rounded-full bg-[#2A2A2D] items-center justify-center active:opacity-70"
                  onPress={handleIncrement}
                >
                  <Text className="text-white text-3xl font-light leading-none mb-1">+</Text>
                </Pressable>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] uppercase mb-3 px-1">
                Log Date
              </Text>
              <Pressable
                onPress={() => {
                  setTempIosDate(minAllowedDate && selectedDate < minAllowedDate ? minAllowedDate : selectedDate);
                  setShowDatePicker(true);
                }}
                className="flex-row items-center justify-between bg-[#1C1C1E] rounded-2xl p-4 border border-[#2A2A2D]/50 active:opacity-80"
              >
                <View className="flex-row items-center gap-3">
                  <CalendarBlank size={20} color="#D4FF00" weight="bold" />
                  <Text className="text-white text-[15px] font-medium">{formatDateDisplay(selectedDate)}</Text>
                </View>
                <CaretDown size={18} color="#8E8E93" weight="bold" />
              </Pressable>
            </View>

            <View className="mb-8">
              <Text className="text-[#8E8E93] text-[11px] font-semibold tracking-[1.5px] uppercase mb-3 px-1">
                Notes (Optional)
              </Text>
              <View className="bg-[#1C1C1E] rounded-2xl border border-[#2A2A2D]/50 min-h-[120px] p-4">
                <TextInput
                  className="flex-1 text-white text-[15px] font-sans"
                  placeholder="How are you feeling today?"
                  placeholderTextColor="#6B6B6B"
                  multiline
                  textAlignVertical="top"
                  value={notes}
                  onChangeText={setNotes}
                  onFocus={() => {
                    isNotesFocusedRef.current = true;
                    setIsNotesFocused(true);
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                  onBlur={() => {
                    isNotesFocusedRef.current = false;
                    setIsNotesFocused(false);
                  }}
                  style={{ paddingTop: 0, minHeight: 80 }}
                />
              </View>
            </View>

            <View className="pb-8">
              <Pressable
                className={`rounded-full py-4 flex-row items-center justify-center active:opacity-80 shadow-lg ${isPending ? 'bg-[#D4FF00]/50' : 'bg-[#D4FF00]'
                  }`}
                onPress={handleSave}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#09090B" />
                ) : (
                  <>
                    <Text className="text-[#09090B] font-semibold text-[17px] mr-2">Save Weight</Text>
                    <CheckCircle size={20} weight="regular" color="#09090B" />
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {showDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          minimumDate={minAllowedDate}
          maximumDate={maxAllowedDate}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowDatePicker(false);
            if (event.type === 'set' && date) {
              if (minAllowedDate && date < minAllowedDate) {
                toast.error('Cannot select a date prior to your account creation date.');
                return;
              }
              const now = new Date();
              const picked = new Date(date);
              picked.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
              handleDateChange(picked);
            }
          }}
        />
      )}

      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={true} transparent={true} animationType="fade">
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-[#1C1C1E] p-4 rounded-t-3xl pb-8 border-t border-[#2A2A2D]">
              <View className="flex-row justify-between items-center mb-4 px-2">
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text className="text-gray-400 text-base">Cancel</Text>
                </Pressable>
                <Text className="text-white font-semibold text-base">Select Date</Text>
                <Pressable
                  onPress={() => {
                    setShowDatePicker(false);
                    if (minAllowedDate && tempIosDate < minAllowedDate) {
                      toast.error('Cannot select a date prior to your account creation date.');
                      handleDateChange(minAllowedDate);
                    } else {
                      handleDateChange(tempIosDate);
                    }
                  }}
                >
                  <Text className="text-[#D4FF00] font-semibold text-base">Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempIosDate}
                mode="date"
                display="inline"
                themeVariant="dark"
                minimumDate={minAllowedDate}
                maximumDate={maxAllowedDate}
                onChange={(_event: DateTimePickerEvent, date?: Date) => {
                  if (date) {
                    if (minAllowedDate && date < minAllowedDate) {
                      toast.error('Cannot select a date prior to your account creation date.');
                      return;
                    }
                    const now = new Date();
                    const picked = new Date(date);
                    picked.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                    setTempIosDate(picked);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
