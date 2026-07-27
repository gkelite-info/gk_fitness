import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerLightHaptic } from '@/lib/haptics';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  activeScale?: number;
  hapticOnPress?: boolean;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

/**
 * High-performance native physics micro-interaction wrapper using React Native Reanimated.
 * Provides smooth scale-down compression and bouncy spring restoration on touch.
 */
export function AnimatedPressable({
  children,
  style,
  activeScale = 0.96,
  hapticOnPress = false,
  onPressIn,
  onPressOut,
  onPress,
  ...otherProps
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressableComponent
      {...otherProps}
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(activeScale, { damping: 15, stiffness: 350 });
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 350 });
        if (onPressOut) onPressOut(e);
      }}
      onPress={(e) => {
        if (hapticOnPress) triggerLightHaptic();
        if (onPress) onPress(e);
      }}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
