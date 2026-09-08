import { Stack } from 'expo-router';

export default function WeeklyWorkoutPlanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit-day" />
    </Stack>
  );
}
