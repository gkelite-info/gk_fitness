import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, Pressable, TextInput, KeyboardAvoidingView, Platform, Image, Linking, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { Text } from '@/components/nativewindui/Text';
import { useRouter, Stack } from 'expo-router';
import { GymAttributes } from '@/helpers/gym/gymHelper';
import { supabase } from '@/lib/supabase';
import { setSelectedGym } from '@/helpers/tenantHelper';
import { MagnifyingGlass, CaretRight, Building, Barbell } from 'phosphor-react-native';

function FloatingEmptyIcon() {
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    
    rotation.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(-10, { duration: 1200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` }
    ],
  }));

  return (
    <Animated.View style={animatedStyle} className="mb-6 items-center justify-center w-24 h-24 rounded-full bg-[#121212] border border-[#1E1E1E]">
      <Barbell size={44} color="#D4FF00" weight="duotone" />
    </Animated.View>
  );
}

export default function FindOrganizationScreen() {
  const router = useRouter();
  const [gyms, setGyms] = useState<GymAttributes[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setGyms([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: searchError } = await supabase
          .from('gyms')
          .select('*')
          .eq('is_deleted', false)
          .ilike('gymName', `%${searchQuery.trim()}%`)
          .order('createdAt', { ascending: false })
          .limit(20);

        if (searchError) throw searchError;
        setGyms(data || []);
      } catch (err) {
        console.error('[FindOrganization] Search error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectGym = async (gym: GymAttributes) => {
    await setSelectedGym({
      gymId: gym.gymId!,
      gymName: gym.gymName,
      logo: gym.logo,
    });
    router.replace('/auth/otp-auth');
  };

  const renderGymItem = ({ item }: { item: GymAttributes }) => (
    <Pressable
      onPress={() => handleSelectGym(item)}
      className="bg-[#121212] border border-[#1E1E1E] rounded-xl p-4 mb-3 flex-row items-center active:opacity-80"
    >
      <View className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center mr-4 border border-[#2A2A2A] overflow-hidden">
        {item.logo ? (
          <Image source={{ uri: item.logo }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Building size={24} color="#6B6B6B" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-semibold mb-0.5">{item.gymName}</Text>
        <Text className="text-[#8E8E93] text-xs font-medium">
          {item.city}, {item.state}
        </Text>
      </View>
      <CaretRight size={20} color="#6B6B6B" />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#09090B]"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 px-6 pt-20">
          <View className="mb-8">
            <Text className="text-[#D4FF00] text-sm font-semibold uppercase tracking-widest mb-2">Welcome</Text>
            <Text className="text-white text-3xl font-bold mb-2">Find Your Gym</Text>
            <Text className="text-[#8E8E93] text-sm leading-5">
              Select your organization to continue with the sign in process and access your account.
            </Text>
          </View>

        <View className="flex-row items-center bg-[#121212] border border-[#1E1E1E] rounded-xl px-4 py-3 mb-6">
          <MagnifyingGlass size={20} color="#6B6B6B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or city..."
            placeholderTextColor="#6B6B6B"
            className="flex-1 text-white text-[15px] p-0 ml-3 font-medium"
            autoCapitalize="none"
          />
        </View>

        <View className="flex-1">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#D4FF00" />
            </View>
          ) : error ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-red-500 mb-2">Error loading gyms:</Text>
              <Text className="text-[#8E8E93] text-sm text-center px-4">
                {error instanceof Error ? error.message : JSON.stringify(error)}
              </Text>
            </View>
          ) : (
            <FlatList
              data={gyms}
              keyExtractor={(item) => item.gymId || item.gymName}
              renderItem={renderGymItem}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center">
                  <FloatingEmptyIcon />
                  <Text className="text-[#8E8E93] text-[15px] font-medium text-center">
                    {searchQuery.trim() ? "No gyms found matching your search." : "Enter a gym name to search."}
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* Support Section for App Store Review / Best Practices (Guideline 3.2) */}
        <View className="pb-8 pt-4 flex-row items-center justify-center">
          <Text className="text-[#6B6B6B] text-[13px]">Gym not listed? </Text>
          <Pressable onPress={() => Linking.openURL('https://www.gkeliteinfo.com/contact')} className="active:opacity-70">
            <Text className="text-[#8E8E93] text-[13px] font-medium underline">Contact Support</Text>
          </Pressable>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
