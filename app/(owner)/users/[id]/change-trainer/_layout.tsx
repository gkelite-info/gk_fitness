import { Stack } from 'expo-router';

export default function ChangeTrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[trainerId]" />
    </Stack>
  );
}
