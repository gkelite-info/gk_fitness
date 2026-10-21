import { Stack } from 'expo-router';

export default function TrainerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="book-trainer" />
      <Stack.Screen name="trainer-request" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
