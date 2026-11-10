import { useState, useRef, useEffect } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretRight, CalendarBlank, FileText, CaretLeft, ClockCounterClockwiseIcon } from 'phosphor-react-native';
import { useProgressData } from '@/hooks/fitness/useProgressData';
import { useUpdateMeasurements } from '@/hooks/fitness/useUpdateProgress';
import { useUser } from '@/context/UserContext';
import { ActivityIndicator } from 'react-native';
import { toast } from '@/lib/toast';

const formatDateDisplay = (date: Date = new Date()) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest', defaultValue: '0', unit: 'cm' },
  { key: 'waist', label: 'Waist', defaultValue: '0', unit: 'cm' },
  { key: 'hips', label: 'Hips', defaultValue: '0', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', defaultValue: '0', unit: 'cm' },
  { key: 'forearms', label: 'Forearms', defaultValue: '0', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', defaultValue: '0', unit: 'cm' },
  { key: 'calves', label: 'Calves', defaultValue: '0', unit: 'cm' },
  { key: 'bodyFatPercentage', label: 'Body Fat', defaultValue: '18', unit: '%' },
];

export default function UpdateMeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useUser();
  const { data: progressData } = useProgressData(userId || null);
  const { mutateAsync: updateMeasurements, isPending } = useUpdateMeasurements();

  const current = progressData?.measurementHistory?.[0] || {};

  const [values, setValues] = useState<Record<string, string>>(
    MEASUREMENT_FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: ((current as any)[field.key] || '').toString() }), {})
  );
  const [notes, setNotes] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const isNotesFocusedRef = useRef(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const updateValue = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      const formattedMeasurements: any = {};
      Object.keys(values).forEach(key => {
        if (values[key]) {
          formattedMeasurements[key] = Number(values[key]);
        }
      });
      formattedMeasurements.notes = notes || undefined;

      await updateMeasurements({
        userId: userId,
        measurements: formattedMeasurements,
        loggedAt: new Date().toISOString(),
      });
      toast.success('Measurements saved successfully!');
      router.back();
    } catch (e: any) {
      console.error("Save Measurements Error:", e);
      toast.error(e?.message || 'Error saving measurements');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={isNotesFocused}
      className="flex-1 bg-[#09090B]"
    >
      <View className="flex-1">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: isNotesFocused
              ? (keyboardHeight > 0 ? keyboardHeight + 160 : 340)
              : insets.bottom + 200,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={isNotesFocused && Platform.OS === 'ios'}
        >
          <View className="px-5 pt-6 pb-4">

            <View className="flex-row items-center mb-6">
              <Pressable
                className="mr-3 p-1 -ml-1 active:opacity-70"
                onPress={() => router.back()}
              >
                <CaretLeft size={28} color="#FFFFFF" weight="bold" />
              </Pressable>
              <Text className="text-white text-[28px] font-semibold tracking-tight">Update</Text>
            </View>

            <View className="bg-[#1C1C1E] rounded-2xl p-4 flex-row items-center mb-8 border border-[#2A2A2D]/50">
              <View className="w-14 h-14 rounded-xl bg-[#2E3113] mr-4 border border-[#D4FF00]/20 items-center justify-center">
                <ClockCounterClockwiseIcon size={24} color='#D4FF00' />
              </View>
              <View className="flex-1">
                <Text className="text-white text-[15px] font-semibold mb-1">Track your progress</Text>
                <Text className="text-[#8E8E93] text-[13px] leading-tight">Accurate measurements help you see real transformation.</Text>
              </View>
            </View>

            <Text className="text-[#D4FF00] text-[11px] font-semibold tracking-[1.5px] uppercase mb-4 pl-1">Measurements</Text>

            <View className="bg-[#1C1C1E] rounded-3xl overflow-hidden border border-[#2A2A2D]/50 mb-6">
              {MEASUREMENT_FIELDS.map((field, index) => {
                const isLast = index === MEASUREMENT_FIELDS.length - 1;
                return (
                  <View
                    key={field.key}
                    className={`flex-row items-center justify-between px-5 py-4 ${!isLast ? 'border-b border-[#2A2A2D]/50' : ''}`}
                  >
                    <Text className="text-white text-[15px]">{field.label}</Text>
                    <View className="flex-row items-center">
                      <View className="bg-[#09090B] rounded-lg min-w-[60px] border border-[#2A2A2D]/30 mr-2 flex-row">
                        <TextInput
                          className="flex-1 text-white text-[15px] font-semibold px-3 py-1.5 text-center"
                          keyboardType="numeric"
                          value={values[field.key]}
                          onChangeText={(val) => updateValue(field.key, val)}
                          placeholder="0"
                          placeholderTextColor="#48484A"
                        />
                      </View>
                      <Text className="text-[#8E8E93] text-[13px] w-6">{field.unit}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="bg-[#1C1C1E] rounded-2xl p-4 flex-row items-center mb-4 border border-[#2A2A2D]/50">
              <View className="w-10 h-10 rounded-xl bg-[#2E3113] items-center justify-center mr-4">
                <CalendarBlank size={20} color="#D4FF00" weight="regular" />
              </View>
              <View>
                <Text className="text-[#8E8E93] text-[11px] mb-1">Date</Text>
                <Text className="text-white text-[15px] font-medium">{formatDateDisplay()}</Text>
              </View>
            </View>

            <View
              className="bg-[#1C1C1E] rounded-2xl p-4 flex-row mb-4 border border-[#2A2A2D]/50"
              style={isNotesFocused ? { marginBottom: 24 } : undefined}
            >
              <View className="w-10 h-10 rounded-xl bg-[#2E3113] items-center justify-center mr-4 mt-1">
                <FileText size={20} color="#D4FF00" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-[#8E8E93] text-[11px] mb-1">Notes (optional)</Text>
                <TextInput
                  className="text-[#E5E5EA] text-[15px] p-0 font-sans"
                  placeholder="Add any notes about your measurements..."
                  placeholderTextColor="#6B6B6B"
                  multiline
                  maxLength={120}
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
                  style={{ minHeight: 60, textAlignVertical: 'top', paddingBottom: 8 }}
                />
                <Text className="text-[#6B6B6B] text-[11px] text-right mt-2">{notes.length}/120</Text>
              </View>
            </View>

          </View>
        </ScrollView>

        <View
          className="absolute left-0 right-0 px-5 pt-4 pb-4 bg-transparent"
          style={{ bottom: 75 + insets.bottom + 10 }}
        >
          <Pressable
            className="bg-[#D4FF00] rounded-full py-4 flex-row items-center justify-between px-6 active:opacity-80 shadow-lg"
            onPress={handleSave}
            disabled={isPending}
          >
            <View className="flex-1 items-center">
              {isPending ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <Text className="text-[#09090B] text-[17px] font-semibold">Save Measurements</Text>
              )}
            </View>
            <CaretRight size={20} weight="bold" color="#09090B" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
