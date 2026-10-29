import '@/global.css';

import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
import { LogBox, Platform, Pressable, StatusBar as RNStatusBar } from 'react-native';

// Disable Reanimated strict mode to prevent warnings about reading shared values during component render
try {
  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false,
  });
} catch {
  // Graceful fallback for environments where Reanimated logger is unavailable
}

// Ignore intrusive LogBox popups to prevent Fabric crash cascades in Dev
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  '[Reanimated] Reading from `value` during component render',
  'undefined is not a function',
  'LogBoxInspectorStackFrames',
]);

import { ThemeProvider as NavThemeProvider } from 'expo-router';
import * as Device from 'expo-device';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, asyncStoragePersister } from '@/lib/react-query';
import { OfflineIndicator } from '@/components/OfflineIndicator';

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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from '@/context/UserContext';
import { ToastProvider } from '@/components/ToastProvider';
import { setupNotificationChannels } from '@/lib/services/notificationService';
import { useWatchSync } from '@/hooks/watch/useWatchSync';

function WatchSyncListener() {
  useWatchSync();
  return null;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export {
  ErrorBoundary,
} from 'expo-router';

const isIos26 = Boolean(
  Platform.OS === 'ios' &&
  Device?.osVersion &&
  typeof Device.osVersion === 'string' &&
  Device.osVersion.startsWith('26.')
);

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();

  const [loaded, error] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  useEffect(() => {
    if (error) {
      console.error('🔥 [Font Loading Error]:', error);
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
      setupNotificationChannels().catch(() => { });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <UserProvider>
          {/* @ts-ignore - backgroundColor works in Expo StatusBar */}
          <StatusBar style="light" backgroundColor="#0A0A0A" />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <NavThemeProvider value={NAV_THEME['dark']}>
              <Stack>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="(customer)" options={{ headerShown: false }} />
                <Stack.Screen name="(trainer)" options={{ headerShown: false }} />
                <Stack.Screen name="(owner)" options={{ headerShown: false }} />
                <Stack.Screen name="(superadmin)" options={{ headerShown: false }} />
                <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
                <Stack.Screen name="community" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={MODAL_OPTIONS} />
              </Stack>
              <WatchSyncListener />
              <ToastProvider />
              <OfflineIndicator />
            </NavThemeProvider>
          </GestureHandlerRootView>
        </UserProvider>
      </PersistQueryClientProvider>
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
