import { Stack } from 'expo-router';

export default function ProgressLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="weight" />
      <Stack.Screen name="log-weight" options={{ presentation: 'modal' }} />
      <Stack.Screen name="measurements" />
      <Stack.Screen name="measurements-history" />
      <Stack.Screen name="update-measurements" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="preview-photo" options={{ presentation: 'modal' }} />
      <Stack.Screen name="monthly-analysis" />
    </Stack>
  );
}
