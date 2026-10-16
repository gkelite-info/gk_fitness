import React, { useState } from 'react';
import { View, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  CheckCircle,
  WarningCircle,
  Radio,
  ArrowSquareOut,
  Lightning,
  X,
  CaretDown,
  CaretUp,
} from 'phosphor-react-native';
import { POINTER_COLOR } from './types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GeofenceMetricsHudProps {
  insetsBottom: number;
  isInside: boolean;
  status: string;
  isSimulated: boolean;
  wsMetrics: { packetsSent: number };
  accurateDistance: string;
  heading: number | null;
  bearingDegrees: number;
  headingDirection: string;
  compassDirection: string;
  radiusMeters: number;
  dwellSeconds: number;
  isNavigating?: boolean;
  onOpenDirections: () => void;
  onStopNavigation?: () => void;
  onGeofenceCheckIn: () => void;
}

export function GeofenceMetricsHud({
  insetsBottom,
  isInside,
  status,
  isSimulated,
  wsMetrics,
  accurateDistance,
  heading,
  bearingDegrees,
  headingDirection,
  compassDirection,
  radiusMeters,
  dwellSeconds,
  isNavigating = false,
  onOpenDirections,
  onStopNavigation,
  onGeofenceCheckIn,
}: GeofenceMetricsHudProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed((prev) => !prev);
  };

  if (isCollapsed) {
    return (
      <>
        <View
          style={{ paddingBottom: Math.max(insetsBottom, 12), backgroundColor: '#121316' }}
          className="absolute bottom-0 left-0 right-0 border-t border-[#222328] px-4 pt-2.5 z-20 shadow-2xl"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className={`px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${isInside
                  ? 'bg-[#CCFF00]/15 border border-[#CCFF00]'
                  : status === 'NEARBY'
                    ? 'bg-amber-400/15 border border-amber-400'
                    : 'bg-red-500/15 border border-red-500/50'
                  }`}
              >
                {isInside ? (
                  <CheckCircle size={14} color="#CCFF00" weight="fill" />
                ) : (
                  <WarningCircle
                    size={14}
                    color={status === 'NEARBY' ? '#FBBF24' : '#EF4444'}
                    weight="fill"
                  />
                )}
                <Text
                  className={`text-xs font-semibold uppercase tracking-wider ${isInside
                    ? 'text-[#CCFF00]'
                    : status === 'NEARBY'
                      ? 'text-amber-400'
                      : 'text-red-400'
                    }`}
                >
                  {isInside
                    ? 'INSIDE GEOFENCE'
                    : status === 'NEARBY'
                      ? 'APPROACHING GYM'
                      : 'OUTSIDE GEOFENCE'} • {accurateDistance}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {isInside && (
                <Pressable
                  onPress={onGeofenceCheckIn}
                  className="bg-[#CCFF00] px-3 py-1.5 rounded-full flex-row items-center gap-1 active:opacity-85 shadow-md shadow-[#CCFF00]/20"
                >
                  <Lightning size={14} color="#000000" weight="fill" />
                  <Text className="text-black text-xs font-bold">Check-In</Text>
                </Pressable>
              )}

              <Pressable
                onPress={toggleCollapse}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="flex-row items-center gap-1.5 bg-[#1E2025] border border-[#2D3038] px-3 py-1.5 rounded-full active:opacity-75"
                accessibilityLabel="Show geofence details panel"
              >
                <CaretUp size={14} color="#CCFF00" weight="bold" />
                <Text className="text-[11px] font-semibold text-white">Show Tab</Text>
                <CaretUp size={14} color="#CCFF00" weight="bold" />
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: Math.max(insetsBottom, 12),
            backgroundColor: '#121316',
            zIndex: 19,
          }}
        />
      </>
    );
  }

  return (
    <>
      <View
        style={{ paddingBottom: Math.max(insetsBottom, 20), backgroundColor: '#121316' }}
        className="absolute bottom-0 left-0 right-0 border-t border-[#222328] px-5 pt-3 z-20 shadow-2xl"
      >
        {/* Arrow Down Collapse Button */}
        <Pressable
          onPress={toggleCollapse}
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
          className="items-center justify-center -mt-1 mb-2.5 py-0.5 flex-row gap-1 self-center active:opacity-70"
          accessibilityLabel="Hide geofence details panel"
        >
          <View className="flex-row items-center gap-1.5 bg-[#1A1C20] border border-[#2B2D33] px-3.5 py-1 rounded-full">
            <CaretDown size={13} color="#CCFF00" weight="bold" />
            <Text className="text-[11px] font-semibold text-[#8E929A]">Hide Tab</Text>
            <CaretDown size={13} color="#CCFF00" weight="bold" />
          </View>
        </Pressable>

        <View className="flex-row items-center justify-between mb-3.5">
          <View className="flex-row items-center gap-2">
            <View
              className={`px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${isInside
                ? 'bg-[#CCFF00]/15 border border-[#CCFF00]'
                : status === 'NEARBY'
                  ? 'bg-amber-400/15 border border-amber-400'
                  : 'bg-red-500/15 border border-red-500/50'
                }`}
            >
              {isInside ? (
                <CheckCircle size={15} color="#CCFF00" weight="fill" />
              ) : (
                <WarningCircle
                  size={15}
                  color={status === 'NEARBY' ? '#FBBF24' : '#EF4444'}
                  weight="fill"
                />
              )}
              <Text
                className={`text-xs font-semibold uppercase tracking-wider ${isInside
                  ? 'text-[#CCFF00]'
                  : status === 'NEARBY'
                    ? 'text-amber-400'
                    : 'text-red-400'
                  }`}
              >
                {isInside
                  ? 'INSIDE GEOFENCE'
                  : status === 'NEARBY'
                    ? 'APPROACHING GYM'
                    : 'OUTSIDE GEOFENCE'}
              </Text>
            </View>

            {isSimulated && (
              <View className="bg-purple-900/40 border border-purple-500/50 px-2 py-1 rounded-md">
                <Text className="text-purple-300 text-[10px] font-semibold">SIMULATION</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-1">
            <Radio size={13} color={POINTER_COLOR} weight="fill" />
            <Text className="text-[#8E929A] text-[11px] font-medium">
              {wsMetrics.packetsSent} telemetry sent
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2.5 mb-4">
          <View className="flex-1 bg-[#1A1C20] border border-[#2B2D33] rounded-2xl px-2.5 py-2.5 justify-between">
            <Text className="text-[#8E929A] text-[9px] font-semibold uppercase tracking-tight mb-0.5" numberOfLines={1}>
              Distance
            </Text>
            <Text className="text-white text-base font-semibold" numberOfLines={1} adjustsFontSizeToFit>
              {accurateDistance}
            </Text>
            <Text className="text-[#6C7079] text-[9px] mt-0.5" numberOfLines={1}>
              Shortest route
            </Text>
          </View>

          <View className="flex-1 bg-[#1A1C20] border border-[#2B2D33] rounded-2xl px-2.5 py-2.5 justify-between">
            <Text className="text-[#8E929A] text-[9px] font-semibold uppercase tracking-tight mb-0.5" numberOfLines={1}>
              Heading
            </Text>
            <View className="flex-row items-baseline gap-1 flex-wrap">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {Math.round(heading || bearingDegrees || 0)}°
              </Text>
              <Text className="text-[#CCFF00] text-[11px] font-semibold" numberOfLines={1}>
                {headingDirection || compassDirection}
              </Text>
            </View>
            <Text className="text-[#6C7079] text-[9px] mt-0.5" numberOfLines={1}>
              facing direction
            </Text>
          </View>

          <View className="flex-1 bg-[#1A1C20] border border-[#2B2D33] rounded-2xl px-2.5 py-2.5 justify-between">
            <Text className="text-[#8E929A] text-[9px] font-semibold uppercase tracking-tight mb-0.5" numberOfLines={1}>
              Check-in Zone
            </Text>
            <Text className="text-white text-base font-semibold" numberOfLines={1} adjustsFontSizeToFit>
              {radiusMeters}m
            </Text>
            <Text className="text-[#6C7079] text-[9px] mt-0.5" numberOfLines={1}>
              {isInside ? `Dwelling ${dwellSeconds}s` : 'Radius boundary'}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          {isNavigating && onStopNavigation ? (
            <Pressable
              onPress={onStopNavigation}
              className="flex-1 bg-[#2D1616] border border-red-500/60 py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-75"
            >
              <X size={16} color="#EF4444" weight="bold" />
              <Text className="text-red-400 text-xs font-semibold">Exit Navigation</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onOpenDirections}
              className="flex-1 bg-[#1A1C20] border border-[#2B2D33] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-75"
            >
              <ArrowSquareOut size={16} color={POINTER_COLOR} weight="bold" />
              <Text className="text-white text-xs font-semibold">Directions</Text>
            </Pressable>
          )}

          <Pressable
            onPress={onGeofenceCheckIn}
            className={`flex-1 py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-85 ${isInside
              ? 'bg-[#CCFF00] shadow-lg shadow-[#CCFF00]/20'
              : 'bg-[#2B2D33] opacity-60'
              }`}
          >
            <Lightning size={16} color={isInside ? '#000000' : '#8E929A'} weight="fill" />
            <Text
              className={`text-xs font-semibold ${isInside ? 'text-black' : 'text-[#8E929A]'
                }`}
              numberOfLines={1}
            >
              {isInside ? 'Check-in via Geofence' : 'Inside Zone to Check-In'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Math.max(insetsBottom, 20),
          backgroundColor: '#121316',
          zIndex: 19,
        }}
      />
    </>
  );
}

