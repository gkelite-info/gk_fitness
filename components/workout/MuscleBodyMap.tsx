import React, { useState, useMemo } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import Svg, { Defs, ClipPath, Rect, G } from 'react-native-svg';
import { MuscleValue } from '@/hooks/customWorkout/useCustomWorkoutBuilder';
import { triggerLightHaptic } from '@/lib/haptics';
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

type ViewMode = 'both' | 'front' | 'back';

export function MuscleBodyMap({ selectedMuscles, onToggleMuscle }: MuscleBodyMapProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  const isSelected = (muscle: MuscleValue) => selectedMuscles.includes(muscle);

  const getMuscleColor = (muscle: MuscleValue) =>
    isSelected(muscle) ? MUSCLE_SELECTED : MUSCLE_UNSELECTED;

  const handleToggle = (muscle: MuscleValue) => {
    triggerLightHaptic();
    onToggleMuscle(muscle);
  };

  // ViewBox coordinates precisely framed for each mode
  const currentViewBox = useMemo(() => {
    switch (viewMode) {
      case 'front':
        return '0 0 240 462'; // Exact front silhouette bounding box
      case 'back':
        return '285 0 250 462'; // Exact back silhouette bounding box
      case 'both':
      default:
        return '0 0 535 462'; // Side-by-side layout
    }
  }, [viewMode]);

  const svgHeight = viewMode === 'both' ? 290 : 380;
  
  // Size SVG container to its aspect ratio when single-view to prevent bleed
  const svgWidth = useMemo(() => {
    switch (viewMode) {
      case 'front':
        return Math.round(svgHeight * (240 / 462));
      case 'back':
        return Math.round(svgHeight * (250 / 462));
      case 'both':
      default:
        return '100%';
    }
  }, [viewMode, svgHeight]);

  return (
    <View className="w-full">
      {/* 3-Way Perspective Toggle: [Front] [Both Sides] [Back] */}
      <View className="flex-row items-center bg-[#111111] p-1 rounded-2xl border border-[#27272A] mb-3">
        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setViewMode('front');
          }}
          className={`flex-1 py-2 rounded-xl items-center ${viewMode === 'front' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
        >
          <Text className={`text-xs font-semibold ${viewMode === 'front' ? 'text-black' : 'text-[#8E8E8E]'}`}>
            Front
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setViewMode('both');
          }}
          className={`flex-1 py-2 rounded-xl items-center ${viewMode === 'both' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
        >
          <Text className={`text-xs font-semibold ${viewMode === 'both' ? 'text-black' : 'text-[#8E8E8E]'}`}>
            Both Sides
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerLightHaptic();
            setViewMode('back');
          }}
          className={`flex-1 py-2 rounded-xl items-center ${viewMode === 'back' ? 'bg-[#C4EF00]' : 'bg-transparent'}`}
        >
          <Text className={`text-xs font-semibold ${viewMode === 'back' ? 'text-black' : 'text-[#8E8E8E]'}`}>
            Back
          </Text>
        </Pressable>
      </View>

      {/* Human Silhouette SVG Canvas */}
      <View className="bg-[#121214] border border-[#27272A] rounded-3xl p-3 items-center justify-center overflow-hidden">
        {/* Helper labels on both sides view */}
        {viewMode === 'both' && (
          <View className="w-full flex-row justify-around mb-1 px-4">
            <Text className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">Front View</Text>
            <Text className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider">Back View</Text>
          </View>
        )}

        <View
          className="items-center justify-center overflow-hidden"
          style={{ width: '100%', height: svgHeight }}
        >
          <Svg
            viewBox={currentViewBox}
            width={svgWidth}
            height={svgHeight}
            style={{ alignSelf: 'center' }}
          >
            {/* Hard clipping boundaries to isolate front and back figures */}
            <Defs>
              <ClipPath id="clipFront">
                <Rect x="0" y="0" width="245" height="462" />
              </ClipPath>
              <ClipPath id="clipBack">
                <Rect x="280" y="0" width="255" height="462" />
              </ClipPath>
            </Defs>

            <G
              clipPath={
                viewMode === 'front'
                  ? 'url(#clipFront)'
                  : viewMode === 'back'
                  ? 'url(#clipBack)'
                  : undefined
              }
            >
              {/* Base anatomical body silhouette outline */}
              <BodySilhouettes
                baseColor={BASE_BODY}
                outlineColor={OUTLINE_COLOR}
                contourColor={CONTOUR_COLOR}
              />

              {/* Front-only groups (rendered in 'front' and 'both') */}
              {(viewMode === 'front' || viewMode === 'both') && (
                <>
                  <ChestGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <AbdominalsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <ObliquesGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <BicepsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <QuadricepsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                </>
              )}

              {/* Back-only groups (rendered in 'back' and 'both') */}
              {(viewMode === 'back' || viewMode === 'both') && (
                <>
                  <BackGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <TricepsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <HamstringsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                  <GlutesGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
                </>
              )}

              {/* Dual-sided groups (front & back sections clipped automatically) */}
              <ShouldersGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
              <CalvesGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
              <TrapsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
              <ForearmsGroup onToggleMuscle={handleToggle} getMuscleColor={getMuscleColor} />
            </G>
          </Svg>
        </View>

        {/* Legend */}
        <View className="flex-row items-center justify-center gap-4 mt-2">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#C4EF00]" />
            <Text className="text-[11px] text-[#A1A1AA]">Targeted</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-[#3F3F46]" />
            <Text className="text-[11px] text-[#71717A]">Tap muscle to select</Text>
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
                onPress={() => {
                  triggerLightHaptic();
                  preset.muscles.forEach((m) => {
                    if (!selectedMuscles.includes(m)) {
                      onToggleMuscle(m);
                    }
                  });
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  allActive
                    ? 'bg-[#C4EF00]/20 border-[#C4EF00]'
                    : 'bg-[#18181B] border-[#27272A]'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    allActive ? 'text-[#C4EF00]' : 'text-[#A1A1AA]'
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
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                selectedMuscles.forEach((m) => onToggleMuscle(m));
              }}
            >
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
                <Text className="text-xs font-bold text-[#C4EF00]">
                  {MUSCLE_LABELS[muscle]}
                </Text>
                <Text className="text-xs text-[#C4EF00] font-bold">×</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
