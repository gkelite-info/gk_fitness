import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, LayoutChangeEvent } from 'react-native';
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
  const isInitialized = useRef(false);
  const selectedIndex = tabs.findIndex((t) => t.id === activeTab);
  const tabCount = tabs.length || 1;
  const tabWidth = containerWidth / tabCount;
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (containerWidth > 0 && selectedIndex !== -1) {
      const targetX = selectedIndex * tabWidth;
      if (!isInitialized.current) {
        translateX.value = targetX;
        isInitialized.current = true;
      } else {
        translateX.value = withSpring(targetX, {
          damping: 16,
          stiffness: 160,
          mass: 0.8,
        });
      }
    }
  }, [selectedIndex, containerWidth, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      width: containerWidth / tabCount,
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width - 8; // account for container padding p-1 (4px * 2)
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      if (!isInitialized.current && selectedIndex !== -1) {
        translateX.value = selectedIndex * (width / tabCount);
      }
    }
  };

  return (
    <View
      onLayout={handleLayout}
      className={`flex-row bg-[#161616] rounded-xl p-1 relative overflow-hidden ${containerClassName}`}
    >
      {/* Sliding Active Pill Indicator */}
      {containerWidth > 0 && selectedIndex !== -1 && !tabs[selectedIndex]?.disabled && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              bottom: 4,
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
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg z-10 ${
              tab.disabled ? 'opacity-40' : ''
            }`}
          >
            {IconComp && <IconComp size={18} color={tab.disabled ? '#A1A1AA' : iconColor} weight={iconWeight} />}
            <Text
              className={`ml-2 font-semibold text-xs ${
                tab.disabled ? 'text-[#A1A1AA]' : isActive ? 'text-black font-bold' : 'text-[#A1A1AA]'
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
