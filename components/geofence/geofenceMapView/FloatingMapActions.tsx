import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import {
  NavigationArrow,
  MapPin,
  Crosshair,
  Compass,
  Sparkle,
  Car,
  Buildings,
  Globe,
  SpeakerHigh,
  SpeakerSlash,
  ArrowsClockwise,
  Plus,
  Minus,
} from 'phosphor-react-native';
import { POINTER_COLOR } from './types';

interface FloatingMapActionsProps {
  isNavigating: boolean;
  safeWebView: boolean;
  activeLayer: 'traffic' | 'streets' | 'satellite';
  onSwitchLayer: (layer: 'traffic' | 'streets' | 'satellite') => void;
  isLockingGps: boolean;
  onCenterUser: () => void;
  onCenterGym: () => void;
  onFitBounds: () => void;
  headingDirection: string;
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  showSimControls: boolean;
  onToggleSimControls: () => void;
  isRefreshingGps?: boolean;
  onRefreshGps?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function FloatingMapActions({
  isNavigating,
  safeWebView,
  activeLayer,
  onSwitchLayer,
  isLockingGps,
  onCenterUser,
  onCenterGym,
  onFitBounds,
  headingDirection,
  isVoiceEnabled,
  onToggleVoice,
  showSimControls,
  onToggleSimControls,
  isRefreshingGps = false,
  onRefreshGps,
  onZoomIn,
  onZoomOut,
}: FloatingMapActionsProps) {
  return (
    <>
      {safeWebView && (
        <View
          style={{ top: isNavigating ? 168 : 16 }}
          className="absolute left-4 flex-row bg-[#141519] border border-[#2B2D33] p-1 rounded-2xl z-40 shadow-lg"
        >
          <Pressable
            onPress={() => onSwitchLayer('traffic')}
            className={`px-2.5 py-1.5 rounded-xl flex-row items-center gap-1 ${activeLayer === 'traffic' ? 'bg-[#CCFF00]' : 'bg-transparent'
              }`}
          >
            <Car size={13} color={activeLayer === 'traffic' ? '#000000' : '#A1A4AC'} weight="bold" />
            <Text className={`text-[11px] font-semibold ${activeLayer === 'traffic' ? 'text-black' : 'text-[#A1A4AC]'}`}>
              Traffic
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSwitchLayer('streets')}
            className={`px-2.5 py-1.5 rounded-xl flex-row items-center gap-1 ${activeLayer === 'streets' ? 'bg-[#CCFF00]' : 'bg-transparent'
              }`}
          >
            <Buildings size={13} color={activeLayer === 'streets' ? '#000000' : '#A1A4AC'} weight="bold" />
            <Text className={`text-[11px] font-semibold ${activeLayer === 'streets' ? 'text-black' : 'text-[#A1A4AC]'}`}>
              Streets
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSwitchLayer('satellite')}
            className={`px-2.5 py-1.5 rounded-xl flex-row items-center gap-1 ${activeLayer === 'satellite' ? 'bg-[#CCFF00]' : 'bg-transparent'
              }`}
          >
            <Globe size={13} color={activeLayer === 'satellite' ? '#000000' : '#A1A4AC'} weight="bold" />
            <Text className={`text-[11px] font-semibold ${activeLayer === 'satellite' ? 'text-black' : 'text-[#A1A4AC]'}`}>
              Satellite
            </Text>
          </Pressable>
        </View>
      )}

      {/* Floating Action Controls Stack */}
      <View
        style={{ top: isNavigating ? 168 : 16 }}
        className="absolute right-4 gap-2.5 z-40"
      >
        {/* Recenter directly on user's live position (used when manually panning/moving on map) */}
        <Pressable
          onPress={onCenterUser}
          disabled={isLockingGps}
          className="w-11 h-11 rounded-2xl bg-[#141519] border border-[#2B2D33] items-center justify-center shadow-lg active:opacity-75"
        >
          {isLockingGps ? (
            <ActivityIndicator size="small" color="#CCFF00" />
          ) : (
            <NavigationArrow size={18} color="#CCFF00" weight="fill" />
          )}
        </Pressable>


        <Pressable
          onPress={onCenterGym}
          className="w-11 h-11 rounded-2xl bg-[#141519] border border-[#2B2D33] items-center justify-center shadow-lg active:opacity-75"
        >
          <MapPin size={18} color="#CCFF00" weight="fill" />
        </Pressable>

        {/* Zoom In & Zoom Out Controls (+ / -) */}
        {(onZoomIn || onZoomOut) && (
          <View className="bg-[#141519] border border-[#2B2D33] rounded-2xl overflow-hidden shadow-lg items-center">
            {onZoomIn && (
              <Pressable
                onPress={onZoomIn}
                className="w-11 h-11 items-center justify-center active:bg-[#22242A]"
                accessibilityLabel="Zoom In"
              >
                <Plus size={18} color="#CCFF00" weight="bold" />
              </Pressable>
            )}
            {onZoomIn && onZoomOut && <View className="h-[1px] w-7 bg-[#2B2D33]" />}
            {onZoomOut && (
              <Pressable
                onPress={onZoomOut}
                className="w-11 h-11 items-center justify-center active:bg-[#22242A]"
                accessibilityLabel="Zoom Out"
              >
                <Minus size={18} color="#CCFF00" weight="bold" />
              </Pressable>
            )}
          </View>
        )}

        {/* Target / Crosshair icon commented for now as requested by user
        <Pressable
          onPress={onFitBounds}
          className="w-11 h-11 rounded-2xl bg-[#141519] border border-[#2B2D33] items-center justify-center shadow-lg active:opacity-75"
        >
          <Crosshair size={18} color="#FFFFFF" weight="bold" />
        </Pressable>
        */}

        <View className="w-11 h-11 rounded-2xl bg-[#141519] border border-[#2B2D33] items-center justify-center shadow-lg">
          <Compass size={17} color={POINTER_COLOR} weight="fill" />
          <Text className="text-[#0075DC] text-[9px] font-semibold mt-0.5">
            {headingDirection}
          </Text>
        </View>

        {!isNavigating && (
          <Pressable
            onPress={onToggleVoice}
            className={`w-11 h-11 rounded-2xl border items-center justify-center shadow-lg active:opacity-75 ${isVoiceEnabled
              ? 'bg-[#141519] border-[#0075DC]'
              : 'bg-[#141519] border-[#2B2D33]'
              }`}
          >
            {isVoiceEnabled ? (
              <SpeakerHigh size={18} color="#0075DC" weight="fill" />
            ) : (
              <SpeakerSlash size={18} color="#8E929A" weight="bold" />
            )}
          </Pressable>
        )}

        <Pressable
          onPress={onToggleSimControls}
          className={`w-11 h-11 rounded-2xl border items-center justify-center shadow-lg active:opacity-75 ${showSimControls
            ? 'bg-[#CCFF00] border-[#CCFF00]'
            : 'bg-[#141519] border-[#2B2D33]'
            }`}
        >
          <Sparkle
            size={18}
            color={showSimControls ? '#000000' : '#CCFF00'}
            weight="fill"
          />
        </Pressable>

        {/* GPS Connection Refresh Button placed right after the Sparkle button */}
        {onRefreshGps && (
          <Pressable
            onPress={onRefreshGps}
            disabled={isRefreshingGps || isLockingGps}
            className="w-11 h-11 rounded-2xl bg-[#141519] border border-[#2B2D33] items-center justify-center shadow-lg active:opacity-75"
          >
            {isRefreshingGps || isLockingGps ? (
              <ActivityIndicator size="small" color="#CCFF00" />
            ) : (
              <ArrowsClockwise size={18} color="#CCFF00" weight="bold" />
            )}
          </Pressable>
        )}
      </View>
    </>
  );
}
