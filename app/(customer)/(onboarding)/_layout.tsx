import { Stack } from 'expo-router';
import { OnboardingProvider } from './OnboardingContext';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack initialRouteName="step1" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="step1" />
        <Stack.Screen name="step2" />
        <Stack.Screen name="step3" />
        <Stack.Screen name="step4" />
        <Stack.Screen name="step5" />
      </Stack>
    </OnboardingProvider>
  );
}

