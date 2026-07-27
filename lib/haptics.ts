import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isHapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export function triggerLightHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerMediumHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerHeavyHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerSuccessHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerWarningHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerErrorHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // Ignore on unsupported platforms
  }
}

export function triggerSelectionHaptic(): void {
  if (!isHapticsSupported) return;
  try {
    Haptics.selectionAsync();
  } catch {
    // Ignore on unsupported platforms
  }
}
