import { View, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { BellRingingIcon, UsersThree } from 'phosphor-react-native';

export function Navbar() {
  const insets = useSafeAreaInsets();
  const topPadding = insets.top;

  return (
    <View
      style={{ paddingTop: topPadding }}
      className="border-b border-border pb-3 bg-[#0D0D0D]">
      <RNStatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      <View className="flex-row items-center justify-between px-4 pt-3">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon name="person.fill" size={20} color='#C4C9AC' className="text-muted-foreground text-white" />
          </View>
          <Text className="font-semibold text-white">
            Welcome Back
          </Text>
        </View>

        <View className="flex-row items-center gap-5">
          <UsersThree size={24} weight="regular" color='#ffffff' />
          <Pressable className="opacity-80 active:opacity-50">
            <BellRingingIcon size={24} color='#ffffff' />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
