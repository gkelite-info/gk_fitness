import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface ActivityRingData {
  current: number;
  goal: number;
}

export interface AppleActivityRingsProps {
  move?: ActivityRingData; // Calories (Red / Pink)
  exercise?: ActivityRingData; // Exercise Minutes (Lime Green)
  stand?: ActivityRingData; // Stand Hours or Steps (Cyan / Turquoise)
  size?: number;
  strokeWidth?: number;
  spacing?: number;
  showIcons?: boolean;
  animate?: boolean;
}

// Iconic Apple Watch Activity Ring Colors
export const RING_COLORS = {
  move: {
    stroke: '#FA114F',
    gradientEnd: '#FF2A6D',
    track: '#2A0510',
    icon: '#FA114F',
    label: 'Move',
    unit: 'KCAL',
  },
  exercise: {
    stroke: '#A1FF00',
    gradientEnd: '#B8FF33',
    track: '#142702',
    icon: '#A1FF00',
    label: 'Exercise',
    unit: 'MIN',
  },
  stand: {
    stroke: '#00F0FF',
    gradientEnd: '#33F3FF',
    track: '#02252E',
    icon: '#00F0FF',
    label: 'Stand',
    unit: 'HRS',
  },
};

interface SingleRingProps {
  progress: number; // 0 to 1+
  radius: number;
  center: number;
  strokeWidth: number;
  color: string;
  gradientId: string;
  trackColor: string;
  type: 'move' | 'exercise' | 'stand';
  showIcon?: boolean;
}

function SingleRing({
  progress,
  radius,
  center,
  strokeWidth,
  gradientId,
  trackColor,
  type,
  showIcon = true,
}: SingleRingProps) {
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    // If progress > 1, strokeDashoffset wraps around
    const clampedProgress = Math.min(animatedProgress.value, 1.99);
    const strokeDashoffset = circumference - circumference * clampedProgress;
    return {
      strokeDashoffset,
    };
  });

  // Calculate icon center position at top (12 o'clock = -90 deg)
  const iconX = center;
  const iconY = center - radius;
  const iconRadius = strokeWidth * 0.44;

  return (
    <G>
      {/* Background Track */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Animated Active Arc */}
      <AnimatedCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={animatedProps}
        strokeLinecap="round"
        rotation="-90"
        originX={center}
        originY={center}
      />

      {/* Start Cap Icon Badge (Move -> Arrow, Exercise -> Double Arrow, Stand -> Up Arrow) */}
      {showIcon && (
        <G transform={`translate(${iconX}, ${iconY})`}>
          {/* Circular badge container */}
          <Circle cx={0} cy={0} r={iconRadius} fill="#0A0A0A" />

          {type === 'move' && (
            // Move: Arrow Right (→)
            <Path
              d={`M -${iconRadius * 0.45} 0 L ${iconRadius * 0.3} 0 M 0 -${iconRadius * 0.35} L ${iconRadius * 0.35} 0 L 0 ${iconRadius * 0.35}`}
              stroke="#FA114F"
              strokeWidth={strokeWidth * 0.12}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}

          {type === 'exercise' && (
            // Exercise: Double Arrow Right (»)
            <Path
              d={`M -${iconRadius * 0.4} -${iconRadius * 0.35} L 0 0 L -${iconRadius * 0.4} ${iconRadius * 0.35} M 0 -${iconRadius * 0.35} L ${iconRadius * 0.4} 0 L 0 ${iconRadius * 0.35}`}
              stroke="#A1FF00"
              strokeWidth={strokeWidth * 0.12}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}

          {type === 'stand' && (
            // Stand: Arrow Up (↑)
            <Path
              d={`M 0 ${iconRadius * 0.45} L 0 -${iconRadius * 0.3} M -${iconRadius * 0.35} 0 L 0 -${iconRadius * 0.35} L ${iconRadius * 0.35} 0`}
              stroke="#00F0FF"
              strokeWidth={strokeWidth * 0.12}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </G>
      )}
    </G>
  );
}

/**
 * AppleActivityRings
 * Replicates the authentic Apple Watch Activity Rings with smooth reanimated arcs,
 * start-point icons (→, », ↑), dark background tracks, and layered concentric circles.
 */
export function AppleActivityRings({
  move = { current: 539, goal: 1000 },
  exercise = { current: 8, goal: 30 },
  stand = { current: 8, goal: 12 },
  size = 200,
  strokeWidth = 19,
  spacing = 3,
  showIcons = true,
}: AppleActivityRingsProps) {
  const center = size / 2;

  // Concentric Radii (Outer -> Middle -> Inner)
  const r1 = (size - strokeWidth) / 2;
  const r2 = r1 - strokeWidth - spacing;
  const r3 = r2 - strokeWidth - spacing;

  const moveProgress = move.goal > 0 ? move.current / move.goal : 0;
  const exerciseProgress = exercise.goal > 0 ? exercise.current / exercise.goal : 0;
  const standProgress = stand.goal > 0 ? stand.current / stand.goal : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Outer Move Gradient */}
          <LinearGradient id="moveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FA114F" />
            <Stop offset="100%" stopColor="#FF3377" />
          </LinearGradient>

          {/* Middle Exercise Gradient */}
          <LinearGradient id="exerciseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A1FF00" />
            <Stop offset="100%" stopColor="#70FF00" />
          </LinearGradient>

          {/* Inner Stand Gradient */}
          <LinearGradient id="standGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#00F0FF" />
            <Stop offset="100%" stopColor="#00D2FF" />
          </LinearGradient>
        </Defs>

        {/* 1. Outer Ring: Move (Calories) */}
        <SingleRing
          progress={moveProgress}
          radius={r1}
          center={center}
          strokeWidth={strokeWidth}
          color={RING_COLORS.move.stroke}
          gradientId="moveGradient"
          trackColor={RING_COLORS.move.track}
          type="move"
          showIcon={showIcons}
        />

        {/* 2. Middle Ring: Exercise (Minutes) */}
        <SingleRing
          progress={exerciseProgress}
          radius={r2}
          center={center}
          strokeWidth={strokeWidth}
          color={RING_COLORS.exercise.stroke}
          gradientId="exerciseGradient"
          trackColor={RING_COLORS.exercise.track}
          type="exercise"
          showIcon={showIcons}
        />

        {/* 3. Inner Ring: Stand / Steps (Hours) */}
        <SingleRing
          progress={standProgress}
          radius={r3}
          center={center}
          strokeWidth={strokeWidth}
          color={RING_COLORS.stand.stroke}
          gradientId="standGradient"
          trackColor={RING_COLORS.stand.track}
          type="stand"
          showIcon={showIcons}
        />
      </Svg>
    </View>
  );
}

/**
 * MiniActivityRings
 * Scaled-down miniature 3-ring icon used for the Weekly day-by-day strip (M T W T F S S).
 */
export function MiniActivityRings({
  moveProgress = 0,
  exerciseProgress = 0,
  standProgress = 0,
  size = 32,
  strokeWidth = 3,
  spacing = 1.2,
}: {
  moveProgress?: number;
  exerciseProgress?: number;
  standProgress?: number;
  size?: number;
  strokeWidth?: number;
  spacing?: number;
}) {
  const center = size / 2;
  const r1 = (size - strokeWidth) / 2;
  const r2 = r1 - strokeWidth - spacing;
  const r3 = r2 - strokeWidth - spacing;

  const clamp = (v: number) => Math.min(Math.max(v, 0), 1);
  const p1 = clamp(moveProgress);
  const p2 = clamp(exerciseProgress);
  const p3 = clamp(standProgress);

  const c1 = 2 * Math.PI * r1;
  const c2 = 2 * Math.PI * r2;
  const c3 = 2 * Math.PI * r3;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Tracks */}
        <Circle cx={center} cy={center} r={r1} stroke={RING_COLORS.move.track} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={center} cy={center} r={r2} stroke={RING_COLORS.exercise.track} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={center} cy={center} r={r3} stroke={RING_COLORS.stand.track} strokeWidth={strokeWidth} fill="none" />

        {/* Outer Move */}
        {p1 > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r1}
            stroke="#FA114F"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${c1} ${c1}`}
            strokeDashoffset={c1 - c1 * p1}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        )}

        {/* Middle Exercise */}
        {p2 > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r2}
            stroke="#A1FF00"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${c2} ${c2}`}
            strokeDashoffset={c2 - c2 * p2}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        )}

        {/* Inner Stand */}
        {p3 > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r3}
            stroke="#00F0FF"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${c3} ${c3}`}
            strokeDashoffset={c3 - c3 * p3}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

