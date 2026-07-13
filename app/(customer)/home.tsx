import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';

export default function CustomerHome() {
  return (
    <View className="flex-1 items-center justify-center bg-background p-2">
      <Text variant="title1" className="text-foreground font-bold">
        Vamshi
      </Text>
    </View>
  );
}
