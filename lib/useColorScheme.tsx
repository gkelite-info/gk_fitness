import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/theme/colors';

const THEME_STORAGE_KEY = 'theme-storage';

function useColorScheme() {
  const { colorScheme: nativewindColorScheme, setColorScheme: setNativewindColorScheme } = useNativewindColorScheme();

  useEffect(() => {
    // Load theme from storage on mount
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedTheme) => {
      if (storedTheme === 'dark' || storedTheme === 'light') {
        setNativewindColorScheme(storedTheme);
      } else {
        setNativewindColorScheme('dark'); // Force dark mode by default
      }
    });

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      AsyncStorage.getItem(THEME_STORAGE_KEY).then((storedTheme) => {
        if (!storedTheme || storedTheme === 'system') {
          setNativewindColorScheme('dark'); // Force dark mode by default
        }
      });
    });

    return () => subscription.remove();
  }, [setNativewindColorScheme]);

  function toggleColorScheme() {
    const nextTheme = nativewindColorScheme === 'light' ? 'dark' : 'light';
    setNativewindColorScheme(nextTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function setColorScheme(theme: 'light' | 'dark' | 'system') {
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    if (theme === 'system') {
      setNativewindColorScheme(Appearance.getColorScheme() ?? 'light');
    } else {
      setNativewindColorScheme(theme);
    }
  }

  return {
    colorScheme: nativewindColorScheme ?? 'light',
    isDarkColorScheme: nativewindColorScheme === 'dark',
    setColorScheme,
    toggleColorScheme,
    colors: COLORS[nativewindColorScheme ?? 'light'],
  };
}

export { useColorScheme };
