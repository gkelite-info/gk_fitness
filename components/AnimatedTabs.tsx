import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, LayoutChangeEvent, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/nativewindui/Text';
import { triggerSelectionHaptic } from '@/lib/haptics';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size: number; color: string; weight?: any }>;
  disabled?: boolean;
}

interface AnimatedTabsProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (id: string) => void;
  containerClassName?: string;
  activeBgColor?: string;
}

/**
 * High-performance 120fps native UI thread animated segmented tab bar.
 * Features a gliding physics-based spring background selection pill powered by React Native Reanimated.
 */
export function AnimatedTabs({
  tabs,
  activeTab,
  onTabChange,
  containerClassName = 'mb-6',
  activeBgColor = '#C3F400',
}: AnimatedTabsProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const sharedContainerWidth = useSharedValue(0);
  const sharedContainerHeight = useSharedValue(0);
  const selectedIndex = tabs.findIndex((t) => t.id === activeTab);
  const tabCount = tabs.length || 1;
  const selectedIndexShared = useSharedValue(selectedIndex);
  const isInitializedShared = useSharedValue(false);

  useEffect(() => {
    selectedIndexShared.value = selectedIndex;
  }, [selectedIndex]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    if (sharedContainerWidth.value === 0 || sharedContainerHeight.value === 0) {
      return {
        width: 0,
        opacity: 0,
      };
    }

    const targetWidth = sharedContainerWidth.value / tabCount;
    const targetX = selectedIndexShared.value * targetWidth;

    // Run physics animation entirely on the native UI thread using shared value gating
    const animatedX = isInitializedShared.value
      ? withSpring(targetX, {
        damping: 18,
        stiffness: 150,
        mass: 0.9,
      })
      : targetX;

    return {
      width: targetWidth,
      height: sharedContainerHeight.value,
      transform: [{ translateX: animatedX }],
      opacity: 1,
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const paddingWidth = width - 8; // account for container padding p-1 (4px * 2)
    const paddingHeight = height - 8; // account for container padding p-1 (4px * 2)

    if (paddingWidth > 0 && paddingWidth !== containerWidth) {
      setContainerWidth(paddingWidth);
      sharedContainerWidth.value = paddingWidth;
    }
    if (paddingHeight > 0 && paddingHeight !== containerHeight) {
      setContainerHeight(paddingHeight);
      sharedContainerHeight.value = paddingHeight;
      // Mark as initialized immediately on the UI thread
      isInitializedShared.value = true;
    }
  };

  return (
    <View
      onLayout={handleLayout}
      className={`flex-row bg-[#161616] rounded-xl p-1 relative overflow-hidden ${containerClassName}`}
    >
      {/* Sliding Active Pill Indicator */}
      {containerWidth > 0 && containerHeight > 0 && selectedIndex !== -1 && !tabs[selectedIndex]?.disabled && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              backgroundColor: activeBgColor,
              borderRadius: 8,
            },
            animatedIndicatorStyle,
          ]}
        />
      )}

      {/* Tab Buttons */}
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const IconComp = tab.icon;
        const iconColor = isActive ? '#000000' : '#A1A1AA';
        const iconWeight = isActive ? 'fill' : 'regular';

        return (
          <Pressable
            key={tab.id}
            disabled={tab.disabled}
            onPress={() => {
              if (tab.id !== activeTab && !tab.disabled) {
                triggerSelectionHaptic();
                onTabChange(tab.id);
              }
            }}
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg z-10 ${tab.disabled ? 'opacity-40' : ''
              }`}
          >
            {IconComp && <IconComp size={18} color={tab.disabled ? '#A1A1AA' : iconColor} weight={iconWeight} />}
            <Text
              style={Platform.OS === 'android' ? { fontWeight: 'normal' } : undefined}
              className={`ml-2 text-xs ${tab.disabled ? 'font-semibold text-[#A1A1AA]' : isActive ? 'font-semibold text-black' : 'font-semibold text-[#A1A1AA]'
                }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
