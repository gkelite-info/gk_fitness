import React from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import Svg, { Circle, Line, Path as SvgPath, G } from 'react-native-svg';
import { Globe, ArrowRight } from 'phosphor-react-native';
import { GymMapTarget, POINTER_COLOR } from './types';

interface NativeVectorMapProps {
  activeGym: GymMapTarget;
  userLocation: { latitude: number; longitude: number } | null;
  isInside: boolean;
  isNavigating: boolean;
  accurateDistance: string;
  heading: number | null;
  bearingDegrees: number;
  headingDirection: string;
  compassDirection: string;
  hasGpsSignal?: boolean;
  onOpenBrowserMap: () => void;
  vectorZoom?: number;
}

export function NativeVectorMap({
  activeGym,
  userLocation,
  isInside,
  isNavigating,
  accurateDistance,
  heading,
  bearingDegrees,
  headingDirection,
  compassDirection,
  hasGpsSignal = true,
  onOpenBrowserMap,
  vectorZoom = 1,
}: NativeVectorMapProps) {
  const screenDimensions = Dimensions.get('window');
  const centerSize = Math.min(screenDimensions.width - 40, 360);
  const half = centerSize / 2;

  const deltaLat = (userLocation?.latitude || activeGym.latitude) - activeGym.latitude;
  const deltaLng = (userLocation?.longitude || activeGym.longitude) - activeGym.longitude;

  const baseScale = Math.min(1800, Math.max(80, (half - 40) / (Math.max(0.0015, Math.hypot(deltaLat, deltaLng)) || 1)));
  const scaleFactor = Math.min(3000, Math.max(40, baseScale * vectorZoom));
  const userPosX = Math.max(25, Math.min(centerSize - 25, half + deltaLng * scaleFactor));
  const userPosY = Math.max(25, Math.min(centerSize - 25, half - deltaLat * scaleFactor));

  const currentHead = heading || bearingDegrees || 0;

  return (
    <View className="flex-1 items-center justify-center bg-[#090A0C] px-4">
      <View
        style={{ width: centerSize, height: centerSize }}
        className="rounded-3xl border border-[#22242A] bg-[#0E1015] items-center justify-center relative overflow-hidden shadow-2xl"
      >
        <Svg width={centerSize} height={centerSize}>
          <Line x1={half} y1={0} x2={half} y2={centerSize} stroke="#1C1E24" strokeWidth={1} strokeDasharray="4, 4" />
          <Line x1={0} y1={half} x2={centerSize} y2={half} stroke="#1C1E24" strokeWidth={1} strokeDasharray="4, 4" />

          <Circle cx={half} cy={half} r={half * 0.3} stroke="#22242A" strokeWidth={1} fill="none" />
          <Circle cx={half} cy={half} r={half * 0.6} stroke="#22242A" strokeWidth={1} fill="none" />
          <Circle cx={half} cy={half} r={half * 0.88} stroke="#22242A" strokeWidth={1} fill="none" />

          <Circle
            cx={half}
            cy={half}
            r={Math.max(22, half * 0.22)}
            stroke={hasGpsSignal ? '#CCFF00' : '#888888'}
            strokeWidth={2}
            fill={isInside ? (hasGpsSignal ? 'rgba(204, 255, 0, 0.16)' : 'rgba(160, 160, 160, 0.16)') : (hasGpsSignal ? 'rgba(204, 255, 0, 0.05)' : 'rgba(160, 160, 160, 0.05)')}
          />

          <SvgPath
            d={`M ${userPosX} ${userPosY} L ${userPosX} ${half + (userPosY - half) * 0.4} L ${half + (userPosX - half) * 0.3} ${half + (userPosY - half) * 0.4} L ${half} ${half}`}
            stroke={hasGpsSignal ? POINTER_COLOR : '#888888'}
            strokeWidth={isNavigating ? 4.5 : 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={0.95}
          />

          <Circle cx={half} cy={half} r={9} fill={hasGpsSignal ? '#CCFF00' : '#AAAAAA'} stroke="#000000" strokeWidth={2.5} />
          <Circle cx={half} cy={half} r={3} fill="#000000" />

          <Circle cx={userPosX} cy={userPosY} r={18} fill={hasGpsSignal ? 'rgba(0, 117, 220, 0.25)' : 'rgba(160, 160, 160, 0.25)'} />
          <Circle cx={userPosX} cy={userPosY} r={8} fill={hasGpsSignal ? POINTER_COLOR : '#888888'} stroke="#FFFFFF" strokeWidth={2.5} />

          <G transform={`translate(${userPosX}, ${userPosY}) rotate(${currentHead})`}>
            <SvgPath
              d="M 0 -22 L 6 -10 L -6 -10 Z"
              fill={hasGpsSignal ? POINTER_COLOR : '#888888'}
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          </G>
        </Svg>

        <View className="absolute top-4 left-4 bg-[#141519]/90 border border-[#2B2D33] px-2.5 py-1 rounded-xl">
          <Text className={`text-[11px] font-bold ${hasGpsSignal ? 'text-[#CCFF00]' : 'text-gray-300'}`}>🏋️ {activeGym.gymName}</Text>
          <Text className="text-[#8E929A] text-[9px]">
            {activeGym.city || 'PIN ' + (activeGym.pinCode || '502110')} • 100m Geofence
          </Text>
        </View>

        <View className="absolute bottom-4 left-4 bg-[#141519]/90 border border-[#2B2D33] px-2.5 py-1 rounded-xl">
          <Text className={`text-[11px] font-bold ${hasGpsSignal ? 'text-[#0075DC]' : 'text-gray-400'}`}>
            📍 Live Position • {heading || bearingDegrees}° {headingDirection || compassDirection}
          </Text>
          <Text className="text-[#8E929A] text-[9px]">
            Distance: <Text className="text-white font-bold">{accurateDistance}</Text>
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onOpenBrowserMap}
        className="mt-3 bg-[#141519] border border-[#2B2D33] px-4 py-2.5 rounded-xl flex-row items-center gap-2 active:opacity-75"
      >
        <Globe size={14} color="#0075DC" weight="bold" />
        <Text className="text-[#A1A4AC] text-xs font-semibold">
          Open Full Satellite Map in Browser
        </Text>
        <ArrowRight size={12} color="#8E929A" />
      </Pressable>
    </View>
  );
}
