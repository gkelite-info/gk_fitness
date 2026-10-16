import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  Coordinates,
  GeofenceCircle,
  GeofenceEvaluationResult,
  GeofenceStateTracker,
  GPSFilter,
  GeofenceTransitionEvent,
  evaluateGeofence,
  smoothHeading,
  getCompassDirection,
} from '@/helpers/geofence/geofenceAlgorithm';
import {
  geofenceWebSocket,
  WebSocketStatus,
  WebSocketMetrics,
} from '@/helpers/geofence/geofenceWebSocket';

export interface UseLiveGeofencingOptions {
  gym: {
    gymId: string;
    gymName: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number; // default 100 meters
  };
  userId?: string;
  autoStart?: boolean;
  wsUrl?: string;
  initialCoordinates?: Coordinates | null;
  onEnterGeofence?: (result: GeofenceEvaluationResult) => void;
  onExitGeofence?: (result: GeofenceEvaluationResult) => void;
}

export function useLiveGeofencing({
  gym,
  userId = 'guest-customer',
  autoStart = true,
  wsUrl,
  initialCoordinates,
  onEnterGeofence,
  onExitGeofence,
}: UseLiveGeofencingOptions) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(initialCoordinates || null);
  const [evaluation, setEvaluation] = useState<GeofenceEvaluationResult | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [headingDirection, setHeadingDirection] = useState<string>('N');
  const [isTracking, setIsTracking] = useState(false);
  const [isLockingGps, setIsLockingGps] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | 'undetermined'>('undetermined');
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>(geofenceWebSocket.getStatus());
  const [wsMetrics, setWsMetrics] = useState<WebSocketMetrics>(geofenceWebSocket.metrics);
  const [lastEvent, setLastEvent] = useState<GeofenceTransitionEvent>('INITIAL');
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGpsEnabled, setIsGpsEnabled] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const isTrackingRef = useRef(false);
  const isSimulatedRef = useRef(false);
  isSimulatedRef.current = isSimulated;

  const currentHeadingRef = useRef<number>(0);
  const latestHardwareLocRef = useRef<Location.LocationObject | null>(null);
  const gpsFilter = useRef(new GPSFilter(2.5, 5.0)); // Process noise 2.5, 5m deadband for jitter elimination
  const stateTracker = useRef(new GeofenceStateTracker());
  const gymRef = useRef(gym);
  gymRef.current = gym;

  const callbacksRef = useRef({ onEnterGeofence, onExitGeofence });
  callbacksRef.current = { onEnterGeofence, onExitGeofence };

  useEffect(() => {
    if (wsUrl) {
      geofenceWebSocket.setUrl(wsUrl);
    }
  }, [wsUrl]);

  useEffect(() => {
    const unsub = geofenceWebSocket.onStatusChange((status) => {
      setWsStatus(status);
      setWsMetrics({ ...geofenceWebSocket.metrics });
    });
    return unsub;
  }, []);

  const processCoordinates = useCallback(
    (rawCoord: Coordinates, isDirectGroundTruth = false) => {
      const filteredCoord = isDirectGroundTruth ? rawCoord : gpsFilter.current.filter(rawCoord);
      const targetGym = gymRef.current;

      const geofenceCircle: GeofenceCircle = {
        latitude: targetGym.latitude,
        longitude: targetGym.longitude,
        radiusMeters: targetGym.radiusMeters || 100,
        id: targetGym.gymId,
        name: targetGym.gymName,
      };

      const evalResult = evaluateGeofence(filteredCoord, geofenceCircle);
      const { event, dwellSeconds: dwell } = stateTracker.current.processEvaluation(evalResult);

      setUserLocation(filteredCoord);
      setEvaluation(evalResult);
      setLastEvent(event);
      setDwellSeconds(dwell);

      if (typeof rawCoord.heading === 'number' && rawCoord.heading >= 0) {
        const smoothed = smoothHeading(currentHeadingRef.current, rawCoord.heading);
        currentHeadingRef.current = smoothed;
        setHeading(smoothed);
        setHeadingDirection(getCompassDirection(smoothed));
      }

      if (event === 'GEOFENCE_ENTER') {
        callbacksRef.current.onEnterGeofence?.(evalResult);
      } else if (event === 'GEOFENCE_EXIT') {
        callbacksRef.current.onExitGeofence?.(evalResult);
      }

      geofenceWebSocket.sendTelemetry(
        userId,
        targetGym.gymId,
        targetGym.gymName,
        { ...filteredCoord, heading: currentHeadingRef.current },
        evalResult,
        event,
        dwell
      );

      setWsMetrics({ ...geofenceWebSocket.metrics });
    },
    [userId]
  );

  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (headingSubscription.current) {
      headingSubscription.current.remove();
      headingSubscription.current = null;
    }
    if (isTrackingRef.current) {
      isTrackingRef.current = false;
      setIsTracking(false);
    }
    gpsFilter.current.reset();
    stateTracker.current.reset();
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setErrorMessage(null);
      geofenceWebSocket.connect();

      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {}
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        setIsGpsEnabled(false);
        setErrorMessage('Device location services (GPS) are turned off.');
        setUserLocation(null);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setIsGpsEnabled(false);
        setErrorMessage('Location permission was denied. Please enable it in Settings.');
        setUserLocation(null);
        return;
      }

      setIsGpsEnabled(true);

      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (initial?.coords) {
          latestHardwareLocRef.current = initial;
          processCoordinates({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
            accuracy: initial.coords.accuracy,
            altitude: initial.coords.altitude,
            heading: initial.coords.heading,
            speed: initial.coords.speed,
            timestamp: initial.timestamp,
          });
        }
      } catch (posErr) {
        try {
          const fallbackInitial = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          if (fallbackInitial?.coords) {
            latestHardwareLocRef.current = fallbackInitial;
            processCoordinates({
              latitude: fallbackInitial.coords.latitude,
              longitude: fallbackInitial.coords.longitude,
              accuracy: fallbackInitial.coords.accuracy,
              altitude: fallbackInitial.coords.altitude,
              heading: fallbackInitial.coords.heading,
              speed: fallbackInitial.coords.speed,
              timestamp: fallbackInitial.timestamp,
            });
          }
        } catch { }
      }

      try {
        if (headingSubscription.current) {
          headingSubscription.current.remove();
        }
        headingSubscription.current = await Location.watchHeadingAsync((headingData) => {
          const trueHead = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
          if (typeof trueHead === 'number' && !isNaN(trueHead)) {
            const smoothed = smoothHeading(currentHeadingRef.current, trueHead, 0.35);
            currentHeadingRef.current = smoothed;
            setHeading(smoothed);
            setHeadingDirection(getCompassDirection(smoothed));
          }
        });
      } catch (headingErr) {
      }

      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Frequent updates for responsive navigation
          distanceInterval: 1, // 1 meter precision
          mayShowUserSettingsDialog: true,
        },
        (loc) => {
          if (!isSimulatedRef.current && loc?.coords) {
            latestHardwareLocRef.current = loc;
            processCoordinates({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              altitude: loc.coords.altitude,
              heading: loc.coords.heading ?? currentHeadingRef.current,
              speed: loc.coords.speed,
              timestamp: loc.timestamp,
            });
          }
        }
      );

      if (!isTrackingRef.current) {
        isTrackingRef.current = true;
        setIsTracking(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start GPS tracking.');
    }
  }, [processCoordinates]);

  const lockExactLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsLockingGps(true);
    setIsSimulated(false);
    isSimulatedRef.current = false;

    try {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {}
      }

      const isServicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!isServicesEnabled) {
        setIsGpsEnabled(false);
        setErrorMessage('Device location services (GPS) are turned off.');
        setUserLocation(null);
        setIsLockingGps(false);
        return null;
      }

      const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (perm && perm.status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync().catch(() => null);
        if (req && req.status !== 'granted') {
          setIsGpsEnabled(false);
          setErrorMessage('Location permission was denied.');
          setUserLocation(null);
          setIsLockingGps(false);
          return null;
        }
      }

      setIsGpsEnabled(true);
      setErrorMessage(null);

      // 1. Check if we have a hardware satellite fix from watchPositionAsync
      let loc: Location.LocationObject | null = null;
      if (latestHardwareLocRef.current?.coords) {
        loc = latestHardwareLocRef.current;
      }

      // 2. Fetch fresh high-accuracy position from device GPS hardware with strict timeout to prevent offline hanging
      if (!loc) {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        try {
          loc = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest,
              mayShowUserSettingsDialog: true,
            }),
            timeoutPromise,
          ]);
        } catch {
          loc = null;
        }

        if (!loc) {
          try {
            loc = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                mayShowUserSettingsDialog: true,
              }),
              timeoutPromise,
            ]);
          } catch {
            loc = null;
          }
        }

        if (!loc) {
          try {
            loc = await Location.getLastKnownPositionAsync({
              maxAge: 300000,
            });
          } catch {
            loc = null;
          }
        }
      }

      if (loc?.coords) {
        latestHardwareLocRef.current = loc;
        const fresh: Coordinates = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          altitude: loc.coords.altitude,
          heading: loc.coords.heading ?? currentHeadingRef.current,
          speed: loc.coords.speed,
          timestamp: loc.timestamp,
        };

        gpsFilter.current.forceReset(fresh);
        processCoordinates(fresh, true);
        setIsLockingGps(false);
        return fresh;
      }
    } catch (err: any) {
      console.warn('[lockExactLocation] GPS query issue:', err);
    } finally {
      setIsLockingGps(false);
    }

    // Fallback: If fresh query had a timeout or failed, use recent hardware coordinate
    if (latestHardwareLocRef.current?.coords) {
      const fallbackLoc = latestHardwareLocRef.current;
      const fresh: Coordinates = {
        latitude: fallbackLoc.coords.latitude,
        longitude: fallbackLoc.coords.longitude,
        accuracy: fallbackLoc.coords.accuracy,
        altitude: fallbackLoc.coords.altitude,
        heading: fallbackLoc.coords.heading ?? currentHeadingRef.current,
        speed: fallbackLoc.coords.speed,
        timestamp: fallbackLoc.timestamp,
      };
      gpsFilter.current.forceReset(fresh);
      processCoordinates(fresh, true);
      return fresh;
    }

    if (userLocation) {
      return userLocation;
    }

    return null;
  }, [processCoordinates, userLocation]);

  const refreshLocation = useCallback(async () => {
    return lockExactLocation();
  }, [lockExactLocation]);

  const simulatePosition = useCallback(
    (preset: 'inside' | 'nearby' | 'outside' | { latitude: number; longitude: number }) => {
      setIsSimulated(true);
      isSimulatedRef.current = true;
      const targetGym = gymRef.current;
      let targetLat = targetGym.latitude;
      let targetLng = targetGym.longitude;

      if (preset === 'inside') {
        targetLat += 0.00015;
        targetLng += 0.00015;
      } else if (preset === 'nearby') {
        targetLat += 0.0012;
        targetLng += 0.0012;
      } else if (preset === 'outside') {
        targetLat += 0.005;
        targetLng += 0.005;
      } else if (typeof preset === 'object') {
        targetLat = preset.latitude;
        targetLng = preset.longitude;
      }

      const simCoord: Coordinates = {
        latitude: targetLat,
        longitude: targetLng,
        accuracy: 3,
        speed: 1.2,
        heading: 45,
        timestamp: Date.now(),
      };

      gpsFilter.current.forceReset(simCoord);
      processCoordinates(simCoord, true);
    },
    [processCoordinates]
  );

  const resetSimulation = useCallback(() => {
    setIsSimulated(false);
    isSimulatedRef.current = false;
    lockExactLocation();
  }, [lockExactLocation]);

  useEffect(() => {
    if (autoStart) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => {
      stopTracking();
      geofenceWebSocket.disconnect();
    };
  }, [autoStart, startTracking, stopTracking]);

  useEffect(() => {
    if (!autoStart) return;

    let isMounted = true;

    const checkGpsStatus = async () => {
      try {
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isMounted) return;

        if (!isServicesEnabled) {
          setIsGpsEnabled(false);
          setErrorMessage('Device location services (GPS) are turned off.');
          setUserLocation(null);
          return;
        }

        const perm = await Location.getForegroundPermissionsAsync();
        if (!isMounted) return;

        if (perm.status !== 'granted') {
          setIsGpsEnabled(false);
          setErrorMessage('Location permission was denied. Please enable it in Settings.');
          setUserLocation(null);
          return;
        }

        setErrorMessage(null);
        setIsGpsEnabled((prev) => {
          if (!prev) {
            startTracking();
          }
          return true;
        });
      } catch {
      }
    };

    const interval = setInterval(checkGpsStatus, 1500);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkGpsStatus();
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [autoStart, startTracking]);

  return {
    userLocation,
    evaluation,
    isInside: evaluation?.isInside ?? false,
    status: evaluation?.status ?? 'OUTSIDE',
    distanceMeters: evaluation?.distanceMeters ?? 0,
    distanceFormatted: evaluation?.distanceFormatted ?? '--',
    bearingDegrees: evaluation?.bearingDegrees ?? 0,
    compassDirection: evaluation?.compassDirection ?? 'N',
    heading,
    headingDirection,
    radiusMeters: gym.radiusMeters || 100,
    isTracking,
    isLockingGps,
    permissionStatus,
    wsStatus,
    wsMetrics,
    lastEvent,
    dwellSeconds,
    errorMessage,
    isGpsEnabled,
    isSimulated,
    startTracking,
    stopTracking,
    lockExactLocation,
    refreshLocation,
    simulatePosition,
    resetSimulation,
  };
}
