import type {
  LocationObject,
  LocationHeadingObject,
  LocationSubscription,
  LocationOptions,
  LocationAccuracy,
  LocationGeocodedAddress,
  LocationGeocodedLocation,
} from 'expo-location';

export type {
  LocationObject,
  LocationHeadingObject,
  LocationSubscription,
  LocationOptions,
  LocationAccuracy,
  LocationGeocodedAddress,
  LocationGeocodedLocation,
};

export type PermissionStatus = 'granted' | 'undetermined' | 'denied';

export interface PermissionResponse {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  expires: 'never' | number;
}

// LocationAccuracy enum matching expo-location
export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
} as const;

let ExpoLocationModule: any = null;
let isNativeModuleLoaded = false;

try {
  // Dynamically require expo-location so it doesn't crash during evaluation
  // if native module 'ExpoLocation' is not linked in the current dev client / Expo Go
  ExpoLocationModule = require('expo-location');
  isNativeModuleLoaded = true;
} catch (e) {
  console.warn(
    "[SafeLocation] Native module 'ExpoLocation' is not linked in this app build. " +
    "GPS features will operate in fallback mode until a new dev build is installed (e.g., 'npx expo run:android' or 'eas build')."
  );
}

export const isLocationAvailable = (): boolean => {
  return isNativeModuleLoaded && !!ExpoLocationModule;
};

export async function requestForegroundPermissionsAsync(): Promise<PermissionResponse> {
  if (ExpoLocationModule?.requestForegroundPermissionsAsync) {
    try {
      return await ExpoLocationModule.requestForegroundPermissionsAsync();
    } catch (e) {
      console.warn('[SafeLocation] requestForegroundPermissionsAsync failed:', e);
    }
  }
  return { status: 'undetermined', granted: false, canAskAgain: false, expires: 'never' };
}

export async function getForegroundPermissionsAsync(): Promise<PermissionResponse> {
  if (ExpoLocationModule?.getForegroundPermissionsAsync) {
    try {
      return await ExpoLocationModule.getForegroundPermissionsAsync();
    } catch (e) {
      console.warn('[SafeLocation] getForegroundPermissionsAsync failed:', e);
    }
  }
  return { status: 'undetermined', granted: false, canAskAgain: false, expires: 'never' };
}

export async function enableNetworkProviderAsync(): Promise<void> {
  if (ExpoLocationModule?.enableNetworkProviderAsync) {
    try {
      await ExpoLocationModule.enableNetworkProviderAsync();
    } catch {
      // Ignored if user cancels or provider cannot be enabled
    }
  }
}

export async function hasServicesEnabledAsync(): Promise<boolean> {
  if (ExpoLocationModule?.hasServicesEnabledAsync) {
    try {
      return await ExpoLocationModule.hasServicesEnabledAsync();
    } catch {}
  }
  return false;
}

export async function getCurrentPositionAsync(
  options?: any
): Promise<LocationObject | null> {
  if (ExpoLocationModule?.getCurrentPositionAsync) {
    try {
      return await ExpoLocationModule.getCurrentPositionAsync(options);
    } catch (e) {
      console.warn('[SafeLocation] getCurrentPositionAsync failed:', e);
    }
  }
  return null;
}

export async function getLastKnownPositionAsync(
  options?: any
): Promise<LocationObject | null> {
  if (ExpoLocationModule?.getLastKnownPositionAsync) {
    try {
      return await ExpoLocationModule.getLastKnownPositionAsync(options);
    } catch (e) {
      console.warn('[SafeLocation] getLastKnownPositionAsync failed:', e);
    }
  }
  return null;
}

export async function watchPositionAsync(
  options: any,
  callback: (location: LocationObject) => void
): Promise<LocationSubscription> {
  if (ExpoLocationModule?.watchPositionAsync) {
    try {
      return await ExpoLocationModule.watchPositionAsync(options, callback);
    } catch (e) {
      console.warn('[SafeLocation] watchPositionAsync failed:', e);
    }
  }
  return {
    remove: () => {},
  };
}

export async function watchHeadingAsync(
  callback: (heading: LocationHeadingObject) => void
): Promise<LocationSubscription> {
  if (ExpoLocationModule?.watchHeadingAsync) {
    try {
      return await ExpoLocationModule.watchHeadingAsync(callback);
    } catch (e) {
      console.warn('[SafeLocation] watchHeadingAsync failed:', e);
    }
  }
  return {
    remove: () => {},
  };
}
