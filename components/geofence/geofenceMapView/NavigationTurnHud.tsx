import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  NavigationArrow,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from 'phosphor-react-native';
import { ShortestPathResult } from '@/helpers/geofence/pathfinding';
import { GymMapTarget, POINTER_COLOR } from './types';

interface NavigationTurnHudProps {
  activeGym: GymMapTarget;
  activeRoute: ShortestPathResult;
  currentStepIndex: number;
  accurateDistance: string;
  heading: number | null;
  bearingDegrees: number;
  headingDirection: string;
  compassDirection: string;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  onStopNavigation: () => void;
  onReplayAudio: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onCenterUser?: () => void;
  isLockingGps?: boolean;
}

export function NavigationTurnHud({
  activeGym,
  activeRoute,
  currentStepIndex,
  accurateDistance,
  heading,
  bearingDegrees,
  headingDirection,
  compassDirection,
  isVoiceEnabled,
  onToggleVoice,
  onStopNavigation,
  onReplayAudio,
  onNextStep,
  onPrevStep,
  onCenterUser,
  isLockingGps,
}: NavigationTurnHudProps) {
  return (
    <View className="absolute top-4 left-4 right-4 bg-[#141519] border border-[#0075DC]/70 rounded-2xl p-3.5 z-30 shadow-2xl">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1 mr-2">
          <View className="w-8 h-8 rounded-full bg-[#0075DC]/25 items-center justify-center border border-[#0075DC]">
            <NavigationArrow size={16} color="#0075DC" weight="fill" />
          </View>
          <View className="flex-1">
            <Text className="text-[#0075DC] text-[10px] font-bold uppercase tracking-wider">
              Navigating to {activeGym.gymName}
            </Text>
            <Pressable onPress={onReplayAudio} className="active:opacity-75">
              <Text className="text-white text-xs font-semibold capitalize" numberOfLines={1}>
                {activeRoute.steps?.[currentStepIndex]?.instruction || `Head towards ${activeGym.gymName}`}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          {/* Target recenter button commented for now as requested by user
          {onCenterUser && (
            <Pressable
              onPress={onCenterUser}
              disabled={isLockingGps}
              className="w-8 h-8 rounded-xl bg-[#1A1C20] border border-[#2B2D33] items-center justify-center active:opacity-70"
            >
              {isLockingGps ? (
                <ActivityIndicator size="small" color={POINTER_COLOR} />
              ) : (
                <NavigationArrow size={15} color={POINTER_COLOR} weight="fill" />
              )}
            </Pressable>
          )}
          */}

          <Pressable
            onPress={onToggleVoice}
            className={`w-8 h-8 rounded-xl items-center justify-center border active:opacity-70 ${isVoiceEnabled
              ? 'bg-[#0075DC]/25 border-[#0075DC]'
              : 'bg-[#1A1C20] border-[#2B2D33]'
              }`}
          >
            {isVoiceEnabled ? (
              <SpeakerHigh size={16} color="#0075DC" weight="fill" />
            ) : (
              <SpeakerSlash size={16} color="#8E929A" weight="bold" />
            )}
          </Pressable>

          <Pressable
            onPress={onStopNavigation}
            className="bg-[#2D1616] border border-red-500/70 px-2.5 py-2.5 rounded-xl flex-row items-center gap-1 active:opacity-70"
          >
            <X size={13} color="#EF4444" weight="bold" />
            <Text className="text-red-400 text-xs font-semibold">END</Text>
          </Pressable>
        </View>
      </View>

      {activeRoute.steps && activeRoute.steps.length > 0 && (
        <View className="bg-[#1A1C20] border border-[#2B2D33] rounded-xl px-2.5 py-2 mb-2 flex-row items-center justify-between">
          <Pressable onPress={onReplayAudio} className="flex-row items-center gap-1.5 flex-1 mr-2 active:opacity-75">
            <SpeakerHigh size={13} color={isVoiceEnabled ? '#0075DC' : '#8E929A'} weight="fill" />
            <Text className="text-[#A1A4AC] text-[11px] flex-1" numberOfLines={1}>
              {activeRoute.steps[currentStepIndex]?.distanceFormatted
                ? `In ${activeRoute.steps[currentStepIndex].distanceFormatted} • Tap to hear voice`
                : 'Tap to repeat audio guidance'}
            </Text>
          </Pressable>

          {activeRoute.steps.length > 1 && (
            <View className="flex-row items-center gap-1">
              {currentStepIndex > 0 && (
                <Pressable
                  onPress={onPrevStep}
                  className="bg-[#2B2D33] px-2 py-0.5 rounded-md active:opacity-70"
                >
                  <Text className="text-[#8E929A] text-[10px] font-semibold">Prev</Text>
                </Pressable>
              )}
              {currentStepIndex < activeRoute.steps.length - 1 && (
                <Pressable
                  onPress={onNextStep}
                  className="bg-[#0075DC]/25 border border-[#0075DC] px-2 py-0.5 rounded-md active:opacity-70"
                >
                  <Text className="text-[#0075DC] text-[10px] font-semibold">Next Turn</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      <View className="flex-row items-center justify-between pt-1 border-t border-[#2B2D33]">
        <Text className="text-[#8E929A] text-[11px]">
          Distance: <Text className="text-white font-semibold text-sm">{accurateDistance}</Text>
        </Text>
        <Text className="text-[#8E929A] text-[11px]">
          Est. Time: <Text className="text-[#CCFF00] font-semibold text-sm">{activeRoute.durationFormatted}</Text>
        </Text>
        <Text className="text-[#8E929A] text-[11px]">
          Heading: <Text className="text-[#0075DC] font-semibold text-sm">{Math.round(heading || bearingDegrees || 0)}° {headingDirection || compassDirection}</Text>
        </Text>
      </View>
    </View>
  );
}
