export const POINTER_COLOR = '#0075DC';

export function getSafeWebViewComponent(): any | null {
  try {
    const { TurboModuleRegistry, NativeModules } = require('react-native');
    const hasModule =
      (TurboModuleRegistry?.get && TurboModuleRegistry.get('RNCWebViewModule')) ||
      (NativeModules && NativeModules.RNCWebView);
    if (hasModule) {
      return require('react-native-webview').WebView;
    }
  } catch {
  }
  return null;
}

export const SafeWebView = getSafeWebViewComponent();

export interface GymMapTarget {
  gymId: string;
  gymName: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  radiusMeters?: number;
}

export interface GeofenceMapViewModalProps {
  visible: boolean;
  gym: GymMapTarget | null;
  userId?: string;
  initialUserLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onCheckInSuccess?: () => void;
}
