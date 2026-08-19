import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, User, Clock, CaretDown, Info, CalendarBlank, Plus, Minus } from 'phosphor-react-native';
import { useUser } from '@/context/UserContext';
import { useGymCheckInRules } from '@/hooks/gymCheckInRules/useGymCheckInRules';
import { saveGymCheckInRule } from '@/helpers/gymCheckInRules/gymCheckInRulesHelper';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { ActivityIndicator } from 'react-native';

export default function CheckInRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { gymId: currentGymId, gymOwnerId } = useUser();
  const { data: ruleData, isLoading } = useGymCheckInRules(currentGymId || undefined);

  const [ruleId, setRuleId] = useState<string | undefined>(undefined);
  const [limit, setLimit] = useState(2);
  const [gapMinutes, setGapMinutes] = useState(120);
  const [showGapModal, setShowGapModal] = useState(false);
  const gapOptions = Array.from({ length: 48 }, (_, i) => (i + 1) * 15); // 15 to 720 mins (12 hours) in 15 min increments

  const formatDuration = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0 && m > 0) return `${hrs} Hour${hrs > 1 ? 's' : ''} ${m} Minutes`;
    if (hrs > 0) return `${hrs} Hour${hrs > 1 ? 's' : ''}`;
    return `${m} Minutes`;
  };

  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (ruleData) {
      setRuleId(ruleData.ruleId);
      setLimit(ruleData.dailyLimit);
      setGapMinutes(ruleData.minGapMinutes);
      setCreatedAt(ruleData.createdAt);
    }
  }, [ruleData]);

  const increment = () => {
    if (limit < 10) setLimit(limit + 1);
  };

  const decrement = () => {
    if (limit > 1) setLimit(limit - 1);
  };

  const handleSave = async () => {
    if (!currentGymId || !gymOwnerId) {
      console.error('[CheckInRulesScreen] Missing gym or owner information');
      toast.error('Missing gym or owner information.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ruleId,
        gymId: currentGymId,
        dailyLimit: limit,
        minGapMinutes: gapMinutes,
        createdBy: gymOwnerId,
        createdAt,
      };

      await saveGymCheckInRule(payload);

      await queryClient.invalidateQueries({ queryKey: ['gymCheckInRules', currentGymId] });
      toast.success('Check-in rules saved successfully.');
      router.back();
    } catch (error: any) {
      console.error('[CheckInRulesScreen] Error saving check-in rules:', error);
      toast.error('Failed to save rules: ' + error.message);
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
        <View className="flex-1">
          <Text className="text-xl font-semibold text-white tracking-wide">Edit Check-in Rules</Text>
          <Text className="text-[#A1A1AA] text-xs mt-0.5 leading-4 pr-4">
            Set how many times a customer can check in and the minimum gap.
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center pt-20">
            <ActivityIndicator color="#C4EF00" />
          </View>
        ) : (
          <>
            <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 mb-0 mt-2">
              <View className="flex-row items-start mb-6">
                <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
                  <User size={20} color="#C4EF00" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[15px] font-semibold mb-1">Daily Check-in Limit</Text>
                  <Text className="text-[#A1A1AA] text-xs leading-4">How many times can a customer check in per day?</Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between border border-[#1F1F22] rounded-xl bg-[#0A0A0A] p-2">
                <Pressable
                  onPress={decrement}
                  className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
                >
                  <Minus size={16} color="#FFFFFF" weight="bold" />
                </Pressable>

                <Text className="text-white text-[15px] font-semibold">{limit} times</Text>

                <Pressable
                  onPress={increment}
                  className="w-10 h-10 rounded-lg border border-[#27272A] bg-[#121214] items-center justify-center active:opacity-70"
                >
                  <Plus size={16} color="#C4EF00" weight="bold" />
                </Pressable>
              </View>
            </View>
            <View className="bg-[#161616] border border-[#1F1F22] rounded-2xl p-5 mb-5 mt-5">
              <View className="flex-row items-start mb-6">
                <View className="w-10 h-10 rounded-full bg-[#1E2015] items-center justify-center mr-4">
                  <Clock size={20} color="#C4EF00" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[15px] font-semibold mb-1">Minimum Gap Between Check-ins</Text>
                  <Text className="text-[#A1A1AA] text-xs leading-4 mt-1">Set the minimum time gap required between two check-ins.</Text>
                </View>
              </View>

              <Pressable
                className="flex-row items-center justify-between border border-[#1F1F22] rounded-xl bg-[#0A0A0A] px-4 h-12 mb-5 active:opacity-70"
                onPress={() => setShowGapModal(true)}
              >
                <Text className="text-white text-[15px] font-medium">{formatDuration(gapMinutes)}</Text>
                <CaretDown size={16} color="#FFFFFF" weight="bold" />
              </Pressable>

              <View className="bg-[#121214] border border-[#1F1F22] rounded-xl p-4 flex-row">
                <Info size={18} color="#C4EF00" weight="regular" style={{ marginRight: 10, marginTop: 2 }} />
                <Text className="text-[#A1A1AA] text-xs leading-5 flex-1">
                  Customers can check in up to <Text className="text-[#C4EF00] font-semibold">{limit} times</Text> per day, with at least <Text className="text-[#C4EF00] font-semibold">{formatDuration(gapMinutes)}</Text> between each check-in.
                </Text>
              </View>
            </View>
            <View className="bg-[#161616] border border-[#1F1F22] rounded-xl p-5 flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-[#1E2015] items-center justify-center mr-4">
                <CalendarBlank size={20} color="#C4EF00" weight="regular" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-[15px] font-semibold mb-1">Rule Applies To</Text>
                <Text className="text-[#71717A] text-[10px]">These rules will be applied to all active members.</Text>
              </View>
            </View>
          </>
        )}

        <View
          className="bg-[#0A0A0A] px-5 pt-4 pb-6 flex-row gap-4"
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

      {/* Gap Modal */}
      <Modal visible={showGapModal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 justify-end">
          <Pressable className="absolute inset-0" onPress={() => setShowGapModal(false)} />
          <View className="bg-[#161616] rounded-t-3xl border-t border-[#1F1F22]">
            <View className="flex-row justify-between items-center p-5 border-b border-[#1F1F22]">
              <Text className="text-white font-semibold text-lg">Minimum Gap</Text>
              <Pressable onPress={() => setShowGapModal(false)} className="p-1 -mr-1">
                <Text className="text-[#A1A1AA] text-sm">Close</Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-[350px]">
              {gapOptions.map((gap, index) => (
                <Pressable
                  key={gap}
                  className={`p-4 flex-row justify-between items-center ${index !== gapOptions.length - 1 ? 'border-b border-[#1F1F22]' : ''}`}
                  onPress={() => {
                    setGapMinutes(gap);
                    setShowGapModal(false);
                  }}
                >
                  <Text className={`text-base font-medium ${gapMinutes === gap ? 'text-[#C4EF00]' : 'text-white'}`}>
                    {formatDuration(gap)}
                  </Text>
                  {gapMinutes === gap && (
                    <View className="w-2 h-2 rounded-full bg-[#C4EF00]" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
