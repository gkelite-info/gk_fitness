import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';


const customStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },
};
const customFetch = async (input: any, init?: any): Promise<any> => {
  let attempts = 3;
  while (attempts > 0) {
    const response = await fetch(input, init);
    if (response.status === 400 || response.status === 401) {
      try {
        const clonedResponse = response.clone();
        const body = await clonedResponse.json();
        if (body && (body.code === 'PGRST303' || (body.message && body.message.includes('JWT issued at future')))) {
          attempts--;
          if (attempts > 0) {
            console.warn('[Supabase Fetch] Got PGRST303 (JWT issued at future), retrying in 1s...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
      } catch (e) {
        // Ignore json parse error
      }
    }
    return response;
  }
  return fetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});

export const supabaseAdminAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});