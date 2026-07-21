import '@/global.css';

import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import * as Device from 'expo-device';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StatusBar as RNStatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Icon } from '@/components/nativewindui/Icon';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/theme';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from '@expo-google-fonts/sora';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const isIos26 = Platform.select({ default: false, ios: Device.osVersion?.startsWith('26.') });

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  const [loaded, error] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RNStatusBar
        barStyle="dark-content"
        backgroundColor="white"
        translucent={false}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavThemeProvider value={NAV_THEME[colorScheme]}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(customer)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={MODAL_OPTIONS} />
          </Stack>
        </NavThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const INDEX_OPTIONS = {
  headerLargeTitle: true,
  headerTransparent: isIos26,
  title: 'NativewindUI',
  headerRight: () => <SettingsIcon />,
} as const;

function SettingsIcon() {
  return (
    <Link href="/modal" asChild>
      <Pressable className={cn('opacity-80 active:opacity-50', isIos26 && 'px-1.5')}>
        <Icon name="gearshape" className="text-foreground" />
      </Pressable>
    </Link>
  );
}

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom',
  title: 'Settings',
} as const;
