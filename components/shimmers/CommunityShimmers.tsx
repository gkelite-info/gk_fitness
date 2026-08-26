import React, { useEffect } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const THUMBNAIL_SIZE = width / 3;

function AnimatedShimmer({ style, ...props }: any) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[{ opacity, backgroundColor: '#2C2C2E' }, style]} {...props} />
  );
}

export function ProfileShimmer() {
  const insets = useSafeAreaInsets();
  
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <View className="w-10 h-10" />
        <AnimatedShimmer className="w-32 h-6 rounded" />
        <View className="w-10 h-10" />
      </View>

      {/* Profile Info */}
      <View className="px-4 pt-6 pb-6 border-b border-[#1C1C1E]">
        <View className="flex-row justify-between items-center mb-6">
          <AnimatedShimmer className="w-[86px] h-[86px] rounded-full" />
          <View className="flex-1 flex-row justify-around ml-4">
            {[1, 2, 3].map((i) => (
              <View key={i} className="items-center">
                <AnimatedShimmer className="w-8 h-6 rounded mb-2" />
                <AnimatedShimmer className="w-16 h-3 rounded" />
              </View>
            ))}
          </View>
        </View>
        
        {/* Bio */}
        <AnimatedShimmer className="w-3/4 h-4 rounded mb-2" />
        <AnimatedShimmer className="w-1/2 h-4 rounded mb-6" />

        {/* Buttons */}
        <View className="flex-row gap-2">
          <AnimatedShimmer className="flex-1 h-10 rounded-lg" />
          <AnimatedShimmer className="flex-1 h-10 rounded-lg" />
        </View>
      </View>

      {/* Grid */}
      <View className="flex-row flex-wrap">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, padding: 1 }}>
            <AnimatedShimmer className="w-full h-full" />
          </View>
        ))}
      </View>
    </View>
  );
}

export function FollowersShimmer() {
  return (
    <View className="flex-1 bg-[#0A0A0A]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4 border-b border-[#1C1C1E]">
        <View className="w-10 h-10" />
        <AnimatedShimmer className="w-24 h-6 rounded" />
        <View className="w-10 h-10" />
      </View>
      
      {/* Tabs */}
      <View className="flex-row border-b border-[#1C1C1E]">
        <View className="flex-1 py-3 items-center justify-center">
          <AnimatedShimmer className="w-20 h-5 rounded" />
        </View>
        <View className="flex-1 py-3 items-center justify-center">
          <AnimatedShimmer className="w-20 h-5 rounded" />
        </View>
      </View>

      {/* List */}
      <View className="px-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <View key={i} className="flex-row items-center justify-between py-3 border-b border-[#1C1C1E]">
            <View className="flex-row items-center flex-1">
              <AnimatedShimmer className="w-12 h-12 rounded-full" />
              <View className="ml-3">
                <AnimatedShimmer className="w-32 h-4 rounded mb-2" />
                <AnimatedShimmer className="w-20 h-3 rounded" />
              </View>
            </View>
            <AnimatedShimmer className="w-16 h-8 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
}
