import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretLeftIcon as CaretLeft, UserIcon as User, TargetIcon as Target, LeafIcon as Leaf, ForkKnifeIcon as ForkKnife, FlameIcon as Flame, GlobeIcon as Globe, BellIcon as Bell, ProhibitIcon as Prohibit, PintGlassIcon as Glass, MagicWandIcon as MagicWand, LockIcon as Lock, CaretRightIcon as CaretRight } from 'phosphor-react-native';

export default function NutritionPreferences() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#0A0A0A] pb-28">
      <View className="flex-row items-center px-5 mb-4">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <CaretLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white text-lg font-bold flex-1 text-center pr-8">Nutrition Preferences</Text>
      </View>

      <Text className="text-[#8E8E93] text-sm text-center mb-6">
        Manage your nutrition profile and update your preferences.
      </Text>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="border border-[#C4EF00]/30 rounded-[24px] p-5 mb-8">
          <View className="flex-row items-center mb-6">
            <View className="w-12 h-12 rounded-full border border-[#222222] bg-[#141414] items-center justify-center mr-4">
              <User size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[#C4EF00] text-base font-bold mb-1">Your Current Profile</Text>
              <Text className="text-[#8E8E93] text-xs leading-4 pr-6">
                These preferences are used to create your personalized nutrition plan.
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between pt-2 border-t border-[#222222]">
            <View className="flex-1 items-center px-1 border-r border-[#222222]">
              <Target size={16} color="#C4EF00" weight="bold" style={{ marginBottom: 4 }} />
              <Text className="text-[#8E8E93] text-[9px] font-bold tracking-wider mb-1">GOAL</Text>
              <Text className="text-white text-[11px] font-bold mb-1 text-center">Weight Loss</Text>
              <Text className="text-[#555555] text-[8px] text-center leading-[10px]">Lose fat & build a healthier you</Text>
            </View>

            <View className="flex-1 items-center px-1 border-r border-[#222222]">
              <Leaf size={16} color="#C4EF00" weight="fill" style={{ marginBottom: 4 }} />
              <Text className="text-[#8E8E93] text-[9px] font-bold tracking-wider mb-1">DIET</Text>
              <Text className="text-white text-[11px] font-bold mb-1 text-center">Vegetarian</Text>
              <Text className="text-[#555555] text-[8px] text-center leading-[10px]">No meat, includes dairy & eggs</Text>
            </View>

            <View className="flex-1 items-center px-1 border-r border-[#222222]">
              <ForkKnife size={16} color="#C4EF00" weight="bold" style={{ marginBottom: 4 }} />
              <Text className="text-[#8E8E93] text-[9px] font-bold tracking-wider mb-1">MEALS</Text>
              <Text className="text-white text-[11px] font-bold mb-1 text-center">4 Meals / Day</Text>
              <Text className="text-[#555555] text-[8px] text-center leading-[10px]">Breakfast, Lunch, Snack, Dinner</Text>
            </View>

            <View className="flex-1 items-center px-1">
              <Flame size={16} color="#C4EF00" weight="fill" style={{ marginBottom: 4 }} />
              <Text className="text-[#8E8E93] text-[9px] font-bold tracking-wider mb-1">CALORIES</Text>
              <Text className="text-white text-[11px] font-bold mb-1 text-center">1,850 kcal</Text>
              <Text className="text-[#555555] text-[8px] text-center leading-[10px]">Daily calorie target</Text>
            </View>
          </View>
        </View>

        <Text className="text-white text-base font-bold mb-1">Edit Your Preferences</Text>
        <Text className="text-[#8E8E93] text-xs mb-4">Update any preference and regenerate your nutrition plan.</Text>

        <View className="gap-y-3 mb-6">
          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Target size={20} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Fitness Goal</Text>
              <Text className="text-[#8E8E93] text-[10px]">Your primary fitness objective</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">Weight Loss</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Leaf size={20} color="#4ADE80" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Diet Type</Text>
              <Text className="text-[#8E8E93] text-[10px]">Your dietary preference</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">Vegetarian</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <ForkKnife size={20} color="#60A5FA" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Meals Per Day</Text>
              <Text className="text-[#8E8E93] text-[10px]">How many meals you prefer daily</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">4 Meals</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Globe size={20} color="#FACC15" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Cuisine Preference</Text>
              <Text className="text-[#8E8E93] text-[10px]">Your preferred cuisine style</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">South Indian</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Bell size={20} color="#F472B6" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Allergies</Text>
              <Text className="text-[#8E8E93] text-[10px]">Any food allergies we should know</Text>
            </View>
            <View className="flex-row items-center">
              <View className="border border-[#C4EF00]/50 rounded-full px-2 py-0.5 mr-1">
                <Text className="text-[#C4EF00] text-[8px] font-bold">PEANUTS</Text>
              </View>
              <View className="border border-[#C4EF00]/50 rounded-full px-2 py-0.5 mr-2">
                <Text className="text-[#C4EF00] text-[8px] font-bold">SHELLFISH</Text>
              </View>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Prohibit size={20} color="#EF4444" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Foods to Avoid</Text>
              <Text className="text-[#8E8E93] text-[10px]">Ingredients or foods you avoid</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">Broccoli, Mushrooms</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>

          <Pressable className="bg-[#141414] border border-[#222222] rounded-[16px] p-4 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-4">
              <Glass size={20} color="#60A5FA" weight="fill" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-sm font-bold mb-1">Water Intake Goal</Text>
              <Text className="text-[#8E8E93] text-[10px]">Daily water intake target</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[#C4EF00] text-xs font-bold mr-2">3.0 Liters / Day</Text>
              <CaretRight size={14} color="#555555" />
            </View>
          </Pressable>
        </View>

        <View className="bg-[#141414] border border-[#222222] rounded-[24px] p-5 flex-row items-start mb-6">
          <View className="mr-4 mt-1">
            <MagicWand size={24} color="#C4EF00" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-[#C4EF00] text-sm font-bold mb-2">
              Why update your preferences?
            </Text>
            <Text className="text-[#8E8E93] text-xs leading-5">
              Your body changes, and so do your goals. Updating your preferences helps us create a plan that fits your current lifestyle.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-[#0A0A0A]/95" style={{ paddingBottom: 110 }}>
        <Pressable className="bg-[#C4EF00] rounded-[20px] py-4 items-center justify-center active:opacity-90 mb-4">
          <Text className="text-black font-bold text-lg">Save Changes</Text>
        </Pressable>
        <View className="flex-row items-center justify-center">
          <Lock size={12} color="#555555" weight="fill" style={{ marginRight: 6 }} />
          <Text className="text-[#555555] text-[10px] font-semibold">Your data is secure and private</Text>
        </View>
      </View>
    </View>
  );
}
