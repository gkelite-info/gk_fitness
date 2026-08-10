import React from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useRouter } from 'expo-router';
import { CaretDown, Crown, Star, SketchLogo, Medal, CaretRight, CalendarBlank } from 'phosphor-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const REVENUE_DATA = [
  { month: 'Jan', value: 1.4 },
  { month: 'Feb', value: 0.9 },
  { month: 'Mar', value: 1.7 },
  { month: 'Apr', value: 1.2 },
  { month: 'May', value: 2.6 },
  { month: 'Jun', value: 1.7 },
  { month: 'Jul', value: 2.3 },
];

export default function FinanceDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#09090B]">
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
      >
        {/* Header */}
        <View className="px-5 mb-6 flex-row justify-between items-center">
          <Text className="text-3xl font-bold text-white tracking-wide">Finances</Text>
          <Pressable className="flex-row items-center bg-[#18181B] px-3 py-2 rounded-xl border border-[#27272A]">
            <CalendarBlank size={14} color="#8E8E93" />
            <Text className="text-white text-xs mx-2">This Month</Text>
            <CaretDown size={14} color="#8E8E93" />
          </Pressable>
        </View>

        {/* Summary Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          className="mb-8"
        >
          <Pressable 
            onPress={() => router.push('/(owner)/finance/revenue')}
            className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
            style={{ width: width * 0.38 }}
          >
            <View className="w-12 h-12 rounded-[16px] bg-[#14532D4D] mb-6" />
            <View className="gap-2">
              <Text className="text-[#8E8E93] text-xs">Today's Revenue</Text>
              <Text className="text-white text-[24px] leading-[28px] font-bold tracking-tight">₹8,450</Text>
              <View className="flex-row items-center">
                <Text className="text-[#D4F01E] text-[13px] mr-1.5">+55.5%</Text>
                <Text className="text-[#8E8E93] text-[11px] flex-1" numberOfLines={1}>vs yesterday</Text>
              </View>
            </View>
          </Pressable>

          <Pressable 
            onPress={() => router.push('/(owner)/finance/customers')}
            className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
            style={{ width: width * 0.38 }}
          >
            <View className="w-12 h-12 rounded-[16px] bg-[#7C2D124D] mb-6" />
            <View className="gap-2">
              <Text className="text-[#8E8E93] text-xs">Total Customers</Text>
              <Text className="text-white text-[24px] leading-[28px] font-bold tracking-tight">1,248</Text>
              <View className="flex-row items-center">
                <Text className="text-[#FB923C] text-[13px] mr-1.5">+55.5%</Text>
                <Text className="text-[#8E8E93] text-[11px] flex-1" numberOfLines={1}>this month</Text>
              </View>
            </View>
          </Pressable>

          <View 
            className="bg-[#09090B] p-4 rounded-[24px] border border-[#27272A]"
            style={{ width: width * 0.38 }}
          >
            <View className="w-12 h-12 rounded-[16px] bg-[#1E3A8A4D] mb-6" />
            <View className="gap-2">
              <Text className="text-[#8E8E93] text-xs">Monthly Growth</Text>
              <Text className="text-white text-[24px] leading-[28px] font-bold tracking-tight">+8.4%</Text>
              <View className="flex-row items-center">
                <Text className="text-[#3B82F6] text-[11px] flex-1" numberOfLines={1}>vs last month</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Revenue by Membership Plan */}
        <View className="px-5 mb-8">
          <Text className="text-white font-bold text-base mb-4">Revenue by Membership Plan</Text>
          <View className="bg-[#121214] rounded-3xl p-1">
            <Pressable onPress={() => router.push('/(owner)/finance/membership-plan/gold' as any)} className="flex-row items-center justify-between p-4 border-b border-[#27272A]">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#EAB308]/20 items-center justify-center mr-4">
                  <Crown size={20} color="#EAB308" weight="fill" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>Gold Membership</Text>
                  <Text className="text-[#8E8E93] text-xs">412 Members</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-sm mr-2">₹1,85,000</Text>
                <CaretRight size={14} color="#8E8E93" />
              </View>
            </Pressable>

            <Pressable onPress={() => router.push('/(owner)/finance/membership-plan/premium' as any)} className="flex-row items-center justify-between p-4 border-b border-[#27272A]">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 items-center justify-center mr-4">
                  <Star size={20} color="#8B5CF6" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>Premium Membership</Text>
                  <Text className="text-[#8E8E93] text-xs">286 Members</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-sm mr-2">₹1,26,000</Text>
                <CaretRight size={14} color="#8E8E93" />
              </View>
            </Pressable>

            <Pressable onPress={() => router.push('/(owner)/finance/membership-plan/elite' as any)} className="flex-row items-center justify-between p-4 border-b border-[#27272A]">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 items-center justify-center mr-4">
                  <SketchLogo size={20} color="#3B82F6" weight="fill" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>Elite Membership</Text>
                  <Text className="text-[#8E8E93] text-xs">168 Members</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-sm mr-2">₹74,000</Text>
                <CaretRight size={14} color="#8E8E93" />
              </View>
            </Pressable>

            <Pressable onPress={() => router.push('/(owner)/finance/membership-plan/silver' as any)} className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-10 h-10 rounded-xl bg-[#52525B]/40 items-center justify-center mr-4">
                  <Medal size={20} color="#A1A1AA" weight="regular" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-sm" numberOfLines={1}>Silver Membership</Text>
                  <Text className="text-[#8E8E93] text-xs">98 Members</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-bold text-sm mr-2">₹42,000</Text>
                <CaretRight size={14} color="#8E8E93" />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="px-5 mb-8">
          <View className="bg-[#121214] rounded-3xl p-5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white font-bold text-base">Recent Transactions</Text>
              <Pressable className="flex-row items-center">
                <Text className="text-[#C4EF00] text-xs font-bold mr-1">View All</Text>
                <CaretRight size={12} color="#C4EF00" weight="bold" />
              </Pressable>
            </View>

            <View className="gap-6">
              {[
                { name: 'Rahul Sharma', plan: 'Gold Membership', price: '₹2,499', time: '09:45 AM', img: 'https://i.pravatar.cc/150?u=rahul' },
                { name: 'Sneha Patel', plan: 'Premium Membership', price: '₹3,999', time: '08:20 AM', img: 'https://i.pravatar.cc/150?u=sneha' },
                { name: 'Amit Kumar', plan: 'Elite Membership', price: '₹5,999', time: 'Yesterday', img: 'https://i.pravatar.cc/150?u=amit' },
                { name: 'Neha Kapoor', plan: 'Gold Membership', price: '₹2,499', time: 'Yesterday', img: 'https://i.pravatar.cc/150?u=neha' },
              ].map((tx, idx) => (
                <View key={idx} className="flex-row justify-between items-center">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image source={{ uri: tx.img }} className="w-10 h-10 rounded-full mr-3 bg-[#27272A]" />
                    <View className="flex-1">
                      <Text className="text-white font-bold text-sm" numberOfLines={1}>{tx.name}</Text>
                      <Text className="text-[#8E8E93] text-xs mt-0.5" numberOfLines={1}>{tx.plan}</Text>
                    </View>
                  </View>
                  <View className="items-end flex-row items-center">
                    <View className="items-end mr-2">
                      <Text className="text-white font-bold text-sm">{tx.price}</Text>
                      <Text className="text-[#8E8E93] text-[10px] mt-0.5">{tx.time}</Text>
                    </View>
                    <CaretRight size={14} color="#52525B" />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Monthly Revenue Chart */}
        <View className="px-5 mb-8">
          <View className="bg-[#121214] rounded-3xl p-5">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-white font-bold text-base">Monthly Revenue</Text>
              <Pressable className="flex-row items-center">
                <Text className="text-[#C4EF00] text-xs font-bold mr-1">View Trend</Text>
                <CaretRight size={12} color="#C4EF00" weight="bold" />
              </Pressable>
            </View>

            <View className="h-[200px] flex-row items-end justify-between px-2 pt-2 relative">
              <View className="absolute top-0 bottom-8 left-0 right-0 justify-between pr-2">
                <View className="flex-row items-center"><Text className="text-[#52525B] text-[10px] w-6">3L</Text><View className="flex-1 h-[1px] bg-[#27272A]/30 ml-2" /></View>
                <View className="flex-row items-center"><Text className="text-[#52525B] text-[10px] w-6">2L</Text><View className="flex-1 h-[1px] bg-[#27272A]/30 ml-2" /></View>
                <View className="flex-row items-center"><Text className="text-[#52525B] text-[10px] w-6">1L</Text><View className="flex-1 h-[1px] bg-[#27272A]/30 ml-2" /></View>
                <View className="flex-row items-center"><Text className="text-[#52525B] text-[10px] w-6">0</Text><View className="flex-1 h-[1px] bg-[#27272A]/30 ml-2" /></View>
              </View>
              
              <View className="flex-row flex-1 justify-between items-end pl-8 pb-[1px] z-10">
                {REVENUE_DATA.map((d, i) => (
                  <View key={i} className="items-center w-8">
                    <View 
                      className="w-5 bg-[#C4EF00]" 
                      style={{ height: (d.value / 3) * 150 }} 
                    />
                  </View>
                ))}
              </View>
            </View>
            
            <View className="flex-row justify-between pl-10 pr-2 mt-2">
              {REVENUE_DATA.map((d, i) => (
                <Text key={i} className="text-[#52525B] text-[10px] w-8 text-center">{d.month}</Text>
              ))}
            </View>
            <View className="h-[1px] bg-[#27272A] mt-2 ml-10 mr-2" />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
