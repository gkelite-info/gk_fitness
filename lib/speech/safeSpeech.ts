import type { SpeechOptions, Voice } from 'expo-speech';

export type { SpeechOptions, Voice };

let ExpoSpeechModule: any = null;
let isNativeSpeechAvailable = false;

try {
  // Dynamically require expo-speech so it doesn't crash during evaluation
  // if native module 'ExpoSpeech' is not linked in the current dev client / Expo Go
  ExpoSpeechModule = require('expo-speech');
  isNativeSpeechAvailable = true;
} catch (e) {
  console.warn(
    "[SafeSpeech] Native module 'ExpoSpeech' is not linked in this app build. " +
    "Speech synthesis will operate in fallback mode until a new dev build is installed (e.g. 'npx expo run:android' or EAS dev build)."
  );
}

export const isSpeechAvailable = (): boolean => {
  return isNativeSpeechAvailable && !!ExpoSpeechModule;
};

export function speak(text: string, options?: SpeechOptions): void {
  if (!text) return;
  if (ExpoSpeechModule?.speak) {
    try {
      ExpoSpeechModule.speak(text, options);
      return;
    } catch (err) {
      console.warn('[SafeSpeech] speak failed:', err);
    }
  }
}

export async function stop(): Promise<void> {
  if (ExpoSpeechModule?.stop) {
    try {
      await ExpoSpeechModule.stop();
      return;
    } catch {
      // Ignore stop errors
    }
  }
}

export async function isSpeakingAsync(): Promise<boolean> {
  if (ExpoSpeechModule?.isSpeakingAsync) {
    try {
      return await ExpoSpeechModule.isSpeakingAsync();
    } catch {
      return false;
    }
  }
  return false;
}

export async function getAvailableVoicesAsync(): Promise<Voice[]> {
  if (ExpoSpeechModule?.getAvailableVoicesAsync) {
    try {
      return await ExpoSpeechModule.getAvailableVoicesAsync();
    } catch {
      return [];
    }
  }
  return [];
}

export const maxSpeechInputLength = ExpoSpeechModule?.maxSpeechInputLength ?? 4000;
