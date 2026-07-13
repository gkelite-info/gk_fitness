import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';

export function Navbar() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="border-b border-border bg-background pb-3 bg-[#0D0D0D]">
      <View className="flex-row items-center justify-between px-4 pt-3">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon name="person.fill" size={20} color='#C4C9AC' className="text-muted-foreground text-white" />
          </View>
          <Text variant="subhead" className="font-semibold text-white">
            Welcome Back
          </Text>
        </View>

        <View className="flex-row items-center gap-5">
          <Icon name="bell" color='#C4C9AC' size={24} className="text-foreground" />
          <Pressable className="opacity-80 active:opacity-50">
            <Icon name="line.3.horizontal" color='#C4C9AC' size={24} className="text-foreground" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
