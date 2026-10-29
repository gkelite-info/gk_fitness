import React, { useState } from 'react';
import { View, Pressable, ScrollView, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/nativewindui/Text';
import Svg, { G } from 'react-native-svg';
import { MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { triggerLightHaptic } from '@/lib/haptics';
import { ArrowsOut, X, Check } from 'phosphor-react-native';
import {
  BodySilhouettes,
  ChestGroup,
  BackGroup,
  BicepsGroup,
  TricepsGroup,
  ShouldersGroup,
  AbdominalsGroup,
  ObliquesGroup,
  QuadricepsGroup,
  HamstringsGroup,
  GlutesGroup,
  CalvesGroup,
  TrapsGroup,
  ForearmsGroup,
} from './muscles';

// ──────────────────────────────────────────────────────────────
// Color tokens (GK Fitness sleek dark aesthetic)
// ──────────────────────────────────────────────────────────────
const MUSCLE_UNSELECTED = '#3F3F46'; // Anatomical zinc-700
const MUSCLE_SELECTED = '#C4EF00';   // GK Fitness Neon Lime
const BASE_BODY = '#27272A';         // Zinc-800 silhouette base
const OUTLINE_COLOR = '#3F3F46';     // Muscle contour lines
const CONTOUR_COLOR = '#52525B';     // Head, feet, hands contour accents

// ──────────────────────────────────────────────────────────────
// Muscle group metadata & friendly labels
// ──────────────────────────────────────────────────────────────
export const MUSCLE_LABELS: Record<MuscleValue, string> = {
  CHEST: 'Chest',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  ABDOMINALS: 'Abs',
  OBLIQUES: 'Obliques',
  BACK: 'Back',
  TRAPS: 'Traps',
  QUADRICEPS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
};

// Preset splits for fast selection
const PRESETS: { label: string; muscles: MuscleValue[] }[] = [
  { label: 'Upper', muscles: ['CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS'] },
  { label: 'Lower', muscles: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES'] },
  { label: 'Push', muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'] },
  { label: 'Pull', muscles: ['BACK', 'BICEPS', 'TRAPS', 'FOREARMS'] },
  { label: 'Core', muscles: ['ABDOMINALS', 'OBLIQUES'] },
];

interface MuscleBodyMapProps {
  selectedMuscles: MuscleValue[];
  onToggleMuscle: (muscle: MuscleValue) => void;
}

// ──────────────────────────────────────────────────────────────
// Reusable SVG Anatomical Diagram (Single View with Front & Back)
// ──────────────────────────────────────────────────────────────
interface MuscleSvgDiagramProps {
  svgHeight: number;
  onToggleMuscle: (muscle: MuscleValue) => void;
  getMuscleColor: (muscle: MuscleValue) => string;
}

function MuscleSvgDiagram({
  svgHeight,
  onToggleMuscle,
  getMuscleColor,
}: MuscleSvgDiagramProps) {
  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{ width: '100%', height: svgHeight }}
    >
      <Svg
        viewBox="0 0 535 462"
        width="100%"
        height={svgHeight}
        style={{ alignSelf: 'center' }}
      >
        {/* Base anatomical body silhouette outline - pointerEvents none ensures no touch interference */}
        <G pointerEvents="none">
          <BodySilhouettes
            baseColor={BASE_BODY}
            outlineColor={OUTLINE_COLOR}
            contourColor={CONTOUR_COLOR}
          />
        </G>

        {/* Anatomical muscle groups with localized, non-overlapping touch targets */}
        <TrapsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <ShouldersGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <ChestGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <BackGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <BicepsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <TricepsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <ForearmsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <ObliquesGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <AbdominalsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <GlutesGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <QuadricepsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <HamstringsGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
        <CalvesGroup onToggleMuscle={onToggleMuscle} getMuscleColor={getMuscleColor} />
      </Svg>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export function MuscleBodyMap({ selectedMuscles, onToggleMuscle }: MuscleBodyMapProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  const isSelected = (muscle: MuscleValue) => selectedMuscles.includes(muscle);

  const getMuscleColor = (muscle: MuscleValue) =>
    isSelected(muscle) ? MUSCLE_SELECTED : MUSCLE_UNSELECTED;

  const handleToggle = (muscle: MuscleValue) => {
    triggerLightHaptic();
    onToggleMuscle(muscle);
  };

  const handleApplyPreset = (muscles: MuscleValue[]) => {
    triggerLightHaptic();
    const allActive = muscles.every((m) => selectedMuscles.includes(m));
    if (allActive) {
      // Toggle off all muscles in this preset
      muscles.forEach((m) => {
        if (selectedMuscles.includes(m)) {
          onToggleMuscle(m);
        }
      });
    } else {
      // Add missing muscles in this preset
      muscles.forEach((m) => {
        if (!selectedMuscles.includes(m)) {
          onToggleMuscle(m);
        }
      });
    }
  };

  const handleClearAll = () => {
    triggerLightHaptic();
    selectedMuscles.forEach((m) => onToggleMuscle(m));
  };

  return (
    <View className="w-full">
      {/* Human Silhouette SVG Canvas Card */}
      <View className="bg-[#121214] border border-[#27272A] rounded-3xl p-4 overflow-hidden">
        {/* Card Header: View Title & Fullscreen Button */}
        <View className="w-full flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Target Anatomy
            </Text>
            <Text className="text-sm font-semibold text-white">
              Front & Back View
            </Text>
          </View>

          <Pressable
            onPress={() => {
              triggerLightHaptic();
              setIsFullScreen(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center gap-1.5 bg-[#C4EF00]/15 border border-[#C4EF00]/40 px-3 py-1.5 rounded-xl active:opacity-75"
          >
            <ArrowsOut size={13} color="#C4EF00" weight="bold" />
            <Text className="text-xs font-semibold text-[#C4EF00]">
              Full Screen
            </Text>
          </Pressable>
        </View>

        {/* Anatomical Perspective Markers */}
        <View className="w-full flex-row justify-around mb-1 px-4">
          <View className="bg-[#18181B] border border-[#27272A] px-3 py-0.5 rounded-full">
            <Text className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Front
            </Text>
          </View>
          <View className="bg-[#18181B] border border-[#27272A] px-3 py-0.5 rounded-full">
            <Text className="text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
              Back
            </Text>
          </View>
        </View>

        {/* SVG Anatomical Model */}
        <MuscleSvgDiagram
          svgHeight={310}
          onToggleMuscle={handleToggle}
          getMuscleColor={getMuscleColor}
        />

        {/* Legend */}
        <View className="flex-row items-center justify-center gap-4 mt-2">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#C4EF00]" />
            <Text className="text-[11px] font-semibold text-[#A1A1AA]">
              Targeted ({selectedMuscles.length})
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" />
            <Text className="text-[11px] text-[#71717A]">
              Tap muscle to select
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Preset Splits */}
      <View className="mt-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {PRESETS.map((preset) => {
            const allActive = preset.muscles.every((m) => selectedMuscles.includes(m));
            return (
              <Pressable
                key={preset.label}
                onPress={() => handleApplyPreset(preset.muscles)}
                className={`px-3 py-1.5 rounded-full border ${allActive
                  ? 'bg-[#C4EF00]/20 border-[#C4EF00]'
                  : 'bg-[#18181B] border-[#27272A]'
                  }`}
              >
                <Text
                  className={`text-xs font-semibold ${allActive ? 'text-[#C4EF00]' : 'text-[#A1A1AA]'
                    }`}
                >
                  +{preset.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Selected Muscles Chips */}
      {selectedMuscles.length > 0 && (
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-[#8E8E8E] uppercase tracking-wider">
              Selected ({selectedMuscles.length})
            </Text>
            <Pressable onPress={handleClearAll}>
              <Text className="text-xs text-[#EF4444] font-medium">Clear All</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2">
            {selectedMuscles.map((muscle) => (
              <Pressable
                key={muscle}
                onPress={() => handleToggle(muscle)}
                className="flex-row items-center bg-[#C4EF00]/15 border border-[#C4EF00] px-3 py-1.5 rounded-xl gap-1.5"
              >
                <Text className="text-xs font-semibold text-[#C4EF00]">
                  {MUSCLE_LABELS[muscle]}
                </Text>
                <Text className="text-xs text-[#C4EF00] font-semibold">×</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* Full-Screen Precision Selection Modal                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        visible={isFullScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFullScreen(false)}
        statusBarTranslucent
      >
        <View
          className="flex-1 bg-[#09090B] pt-14"
          style={{
            // paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-[#27272A]">
            <View>
              <Text className="text-lg font-semibold text-white">
                Muscle Target Selector
              </Text>
              <Text className="text-xs text-[#A1A1AA]">
                Tap muscles directly to toggle • {selectedMuscles.length} selected
              </Text>
            </View>

            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setIsFullScreen(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-9 h-9 rounded-full bg-[#18181B] border border-[#27272A] items-center justify-center active:opacity-75"
            >
              <X size={18} color="#FFFFFF" weight="bold" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="py-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {PRESETS.map((preset) => {
                  const allActive = preset.muscles.every((m) => selectedMuscles.includes(m));
                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() => handleApplyPreset(preset.muscles)}
                      className={`px-3.5 py-1.5 rounded-full border mr-1.5 ${allActive
                        ? 'bg-[#C4EF00]/25 border-[#C4EF00]'
                        : 'bg-[#18181B] border-[#27272A]'
                        }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${allActive ? 'text-[#C4EF00]' : 'text-[#A1A1AA]'
                          }`}
                      >
                        +{preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Large Interactive Canvas */}
            <View className="bg-[#121214] border border-[#27272A] rounded-3xl p-4 my-2 items-center">
              {/* Anatomical Perspective Markers */}
              <View className="w-full flex-row justify-around mb-2 px-6">
                <View className="bg-[#1F240A] border border-[#C4EF00]/30 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-[#C4EF00] uppercase tracking-wider">
                    Front View
                  </Text>
                </View>
                <View className="bg-[#1F240A] border border-[#C4EF00]/30 px-3 py-1 rounded-full">
                  <Text className="text-xs font-semibold text-[#C4EF00] uppercase tracking-wider">
                    Back View
                  </Text>
                </View>
              </View>

              {/* High-Resolution SVG Canvas */}
              <MuscleSvgDiagram
                svgHeight={Math.min(screenHeight * 0.52, 460)}
                onToggleMuscle={handleToggle}
                getMuscleColor={getMuscleColor}
              />

              {/* Bottom Legend */}
              <View className="flex-row items-center justify-center gap-5 mt-3 pt-2 border-t border-[#27272A]/60 w-full">
                <View className="flex-row items-center gap-1.5">
                  <View className="w-3 h-3 rounded-full bg-[#C4EF00]" />
                  <Text className="text-xs font-semibold text-[#A1A1AA]">
                    Targeted
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-3 h-3 rounded-full bg-[#3F3F46]" />
                  <Text className="text-xs text-[#71717A]">
                    Tap directly on muscle
                  </Text>
                </View>
              </View>
            </View>

            {/* Selected Muscles Chips in Full Screen */}
            {selectedMuscles.length > 0 && (
              <View className="mt-3 bg-[#121214] border border-[#27272A] p-4 rounded-2xl">
                <View className="flex-row items-center justify-between mb-2.5">
                  <Text className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                    Selected Muscles ({selectedMuscles.length})
                  </Text>
                  <Pressable onPress={handleClearAll}>
                    <Text className="text-xs text-[#EF4444] font-medium">Clear All</Text>
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {selectedMuscles.map((muscle) => (
                    <Pressable
                      key={muscle}
                      onPress={() => handleToggle(muscle)}
                      className="flex-row items-center bg-[#C4EF00]/15 border border-[#C4EF00] px-3.5 py-2 rounded-xl gap-2 active:opacity-75"
                    >
                      <Text className="text-xs font-semibold text-[#C4EF00]">
                        {MUSCLE_LABELS[muscle]}
                      </Text>
                      <Text className="text-xs text-[#C4EF00] font-semibold">×</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <View className="px-0 mt-5 pt-3 border-t border-[#27272A] bg-[#09090B]">
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setIsFullScreen(false);
                }}
                className="w-full bg-[#C4EF00] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 active:opacity-90"
              >
                <Check size={18} color="#000000" weight="bold" />
                <Text className="text-sm font-semibold text-black">
                  {selectedMuscles.length === 0
                    ? 'Done'
                    : `Apply Selection (${selectedMuscles.length} Muscle${selectedMuscles.length === 1 ? '' : 's'
                    })`}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
