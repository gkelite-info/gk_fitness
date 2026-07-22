import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

export default function DashboardScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="title1">Superadmin Dashboard</Text>
    </View>
  );
}
