import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

export function Skeleton({ className, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      className={`bg-[#27272A] rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}
