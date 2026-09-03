import React from 'react';
import { View, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, IdentificationCard, Tote, Ticket } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingTop: 24, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          className="w-full rounded-[24px] overflow-hidden mb-6 h-[260px] active:opacity-90"
          onPress={() => {
            router.push('/(owner)/trainers' as any);
          }}
        >
          <Image
            source={require('../../assets/explore_trainers.png')}
            className="absolute right-0 top-0 bottom-0 w-full h-full opacity-90"
            resizeMode="cover"
          />

          <LinearGradient
            colors={['#0F150A', '#1C290E', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.8, y: 0.5 }}
            className="absolute inset-0"
          />

          <View className="flex-1 p-6 justify-between">
            <View>
              <View className="w-12 h-12 rounded-xl border border-[#D4FF00] items-center justify-center mb-6">
                <IdentificationCard size={24} color="#D4FF00" weight="regular" />
              </View>

              <Text className="text-white text-2xl font-semibold mb-2 tracking-tight">Trainers</Text>
              <Text className="text-[#E5E5EA] text-[13px] leading-5 w-[65%]">
                Find certified trainers for every goal and level of fitness.
              </Text>
            </View>

            <View
              className="bg-[#D4FF00] self-start rounded-full flex-row items-center justify-center px-5 py-3 mt-4"
            >
              <Text className="text-[#09090B] font-semibold text-[14px] mr-2">Explore Trainers</Text>
              <ArrowRight size={16} weight="bold" color="#09090B" />
            </View>
          </View>
        </Pressable>

        <Pressable
          className="w-full rounded-[24px] overflow-hidden mb-6 h-[260px] active:opacity-90"
          onPress={() => {
            // router.push('/(owner)/shop')
          }}
        >
          <Image
            source={require('../../assets/explore_shop.png')}
            className="absolute right-0 top-0 bottom-0 w-full h-full opacity-90"
            resizeMode="cover"
          />

          <LinearGradient
            colors={['#170A24', '#2D144A', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.8, y: 0.5 }}
            className="absolute inset-0"
          />

          <View className="flex-1 p-6 justify-between">
            <View>
              <View className="w-12 h-12 rounded-xl border border-[#A855F7] bg-[#2D144A]/30 items-center justify-center mb-6">
                <Tote size={24} color="#A855F7" weight="regular" />
              </View>

              <Text className="text-white text-2xl font-semibold mb-2 tracking-tight">Shop</Text>
              <Text className="text-[#E5E5EA] text-[13px] leading-5 w-[65%]">
                Supplements, gear and essentials to fuel your fitness journey.
              </Text>
            </View>

            <View
              className="bg-[#A855F7] self-start rounded-full flex-row items-center justify-center px-5 py-3 mt-4"
            >
              <Text className="text-white font-semibold text-[14px] mr-2">Explore Shop</Text>
              <ArrowRight size={16} weight="bold" color="#FFFFFF" />
            </View>
          </View>
        </Pressable>

        <Pressable
          className="w-full rounded-[24px] overflow-hidden mb-6 h-[260px] active:opacity-90"
          onPress={() => {
            // router.push('/(owner)/gympass')
          }}
        >
          <Image
            source={require('../../assets/explore_gympass.png')}
            className="absolute right-0 top-0 bottom-0 w-full h-full opacity-90"
            resizeMode="cover"
          />

          <LinearGradient
            colors={['#081724', '#0C2B47', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.8, y: 0.5 }}
            className="absolute inset-0"
          />

          <View className="flex-1 p-6 justify-between">
            <View>
              <View className="w-12 h-12 rounded-xl border border-[#38BDF8] bg-[#0C2B47]/30 items-center justify-center mb-6">
                <Ticket size={24} color="#38BDF8" weight="regular" />
              </View>

              <Text className="text-white text-2xl font-semibold mb-2 tracking-tight">Gym Pass</Text>
              <Text className="text-[#E5E5EA] text-[13px] leading-5 w-[65%]">
                Track Gympass visits and payouts of your gym.
              </Text>
            </View>

            <View
              className="bg-[#38BDF8] self-start rounded-full flex-row items-center justify-center px-5 py-3 mt-4"
            >
              <Text className="text-[#09090B] font-semibold text-[14px] mr-2">Open Gym Pass</Text>
              <ArrowRight size={16} weight="bold" color="#09090B" />
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
