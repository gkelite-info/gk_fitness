import { View } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className="flex-1 items-center justify-center bg-[#0F0F0F]" 
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-white text-3xl font-bold mb-2">Progress</Text>
      <Text className="text-[#A1A1AA] text-[15px]">Coming Soon...</Text>
    </View>
  );
}
