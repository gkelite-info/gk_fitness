import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  Platform,
  Linking,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin } from 'phosphor-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Speech from '@/lib/speech/safeSpeech';
import { useLiveGeofencing } from '@/hooks/geofence/useLiveGeofencing';
import { calculateHaversineDistance, formatDistance } from '@/helpers/geofence/geofenceAlgorithm';
import {
  calculateShortestPathRoute,
  buildSpatialWaypointGrid,
  findShortestPath,
  ShortestPathResult,
} from '@/helpers/geofence/pathfinding';
import { triggerLightHaptic, triggerSelectionHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { useNetInfo } from '@react-native-community/netinfo';

import {
  SafeWebView,
  GymMapTarget,
  GeofenceMapViewModalProps,
  POINTER_COLOR,
} from './types';
import { generateMapHtml } from './leafletHtml';
import { NativeVectorMap } from './NativeVectorMap';
import { NavigationTurnHud } from './NavigationTurnHud';
import { FloatingMapActions } from './FloatingMapActions';
import { SimulatorDrawer } from './SimulatorDrawer';
import { GeofenceMetricsHud } from './GeofenceMetricsHud';
import { DirectionsSheetModal } from './DirectionsSheetModal';

export function GeofenceMapViewModal({
  visible,
  gym,
  userId,
  initialUserLocation,
  onClose,
  onCheckInSuccess,
}: GeofenceMapViewModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);
  const [showSimControls, setShowSimControls] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'traffic' | 'streets' | 'satellite'>('traffic');

  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [activeRoute, setActiveRoute] = useState<ShortestPathResult | null>(null);
  const [aStarDistance, setAStarDistance] = useState<string | null>(null);
  const [aStarDuration, setAStarDuration] = useState<string | null>(null);
  const lastAStarCoordRef = useRef<{ lat: number; lng: number } | null>(null);
  const cachedAStarRouteRef = useRef<ShortestPathResult | null>(null);

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [vectorZoom, setVectorZoom] = useState(1);

  const speakGuidance = useCallback((text: string) => {
    if (!isVoiceEnabled || !text) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
        return;
      }
      // Speak immediately with zero delay
      Speech.stop().catch(() => {});
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (err) {
      console.warn('[NavigationVoice] Error speaking:', err);
    }
  }, [isVoiceEnabled]);

  const fallbackGym: GymMapTarget = {
    gymId: 'default-gym',
    gymName: 'GK Fitness Center',
    latitude: 17.4381,
    longitude: 78.4559,
    address: 'Ameerpet',
    city: 'Hyderabad',
    pinCode: '500016',
    radiusMeters: 100,
  };

  const activeGym = gym || fallbackGym;

  const {
    userLocation,
    evaluation,
    isInside,
    status,
    distanceFormatted,
    bearingDegrees,
    compassDirection,
    heading,
    headingDirection,
    radiusMeters,
    wsStatus,
    wsMetrics,
    dwellSeconds,
    errorMessage,
    isGpsEnabled,
    permissionStatus,
    isSimulated,
    isLockingGps,
    lockExactLocation,
    simulatePosition,
    resetSimulation,
  } = useLiveGeofencing({
    gym: activeGym,
    userId,
    autoStart: visible,
    initialCoordinates: initialUserLocation,
    onEnterGeofence: () => {
      triggerSuccessHaptic();
      toast.success(`Entered geofence for ${activeGym.gymName}!`);
      if (isNavigating) {
        speakGuidance(`You have arrived at ${activeGym.gymName}. You are inside the check-in zone.`);
      }
    },
    onExitGeofence: () => {
      triggerLightHaptic();
      toast.success(`Exited geofence for ${activeGym.gymName}.`);
    },
  });

  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false;

  const hasLocationAccess = Boolean(
    userLocation &&
    isGpsEnabled &&
    permissionStatus === 'granted' &&
    !errorMessage
  );

  // Both conditions must strictly be true to show the map in color:
  // 1. Device must have location access active
  // 2. Device must have active internet connection
  const isColorMapAllowed = Boolean(hasLocationAccess && isOnline);
  const hasGpsSignal = Boolean(userLocation && isGpsEnabled && permissionStatus === 'granted');

  const lastOnlineRef = useRef<boolean | null>(null);
  const prevLocAccessRef = useRef<boolean | null>(null);
  const hasAutoCenteredRef = useRef(false);

  useEffect(() => {
    if (visible) {
      hasAutoCenteredRef.current = false;
      setMapLoaded(false);
    }
  }, [visible]);

  // Center on user's live position immediately upon map load
  useEffect(() => {
    if (mapLoaded && userLocation && webViewRef.current && !hasAutoCenteredRef.current) {
      hasAutoCenteredRef.current = true;
      webViewRef.current.injectJavaScript?.(`
        if (window.centerOnCoords) {
          window.centerOnCoords(${userLocation.latitude}, ${userLocation.longitude});
        } else if (window.centerOnUser) {
          window.centerOnUser();
        }
        true;
      `);
    }
  }, [mapLoaded, userLocation]);

  // Automatically trigger map reload when internet comes back
  useEffect(() => {
    if (lastOnlineRef.current === false && isOnline === true) {
      toast.success('Internet restored! Live map reloaded.');
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript?.(`
          if (window.setConnectionState) window.setConnectionState(${hasLocationAccess}, true);
          else if (window.setGpsSignalState) window.setGpsSignalState(${hasLocationAccess}, true);
          if (window.reloadMapTiles) window.reloadMapTiles();
          if (window.centerOnUser) window.centerOnUser();
          true;
        `);
      }
    }
    lastOnlineRef.current = isOnline;
  }, [isOnline, hasLocationAccess]);

  // Automatically trigger map reload & recenter when device location comes back
  useEffect(() => {
    if (prevLocAccessRef.current === false && hasLocationAccess === true) {
      toast.success('Device location active! Centering map...');
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript?.(`
          if (window.setConnectionState) window.setConnectionState(true, ${isOnline});
          else if (window.setGpsSignalState) window.setGpsSignalState(true, ${isOnline});
          if (window.centerOnUser) window.centerOnUser();
          if (window.reloadMapTiles) window.reloadMapTiles();
          true;
        `);
      }
    }
    prevLocAccessRef.current = hasLocationAccess;
  }, [hasLocationAccess]);

  // Automatically refresh map when app returns to active (e.g. from system settings or notification shade)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && webViewRef.current) {
        webViewRef.current.injectJavaScript?.(`
          if (window.reloadMapTiles) window.reloadMapTiles();
          if (window.setGpsSignalState) window.setGpsSignalState(${hasLocationAccess});
          true;
        `);
      }
    });
    return () => sub.remove();
  }, [hasLocationAccess]);

  useEffect(() => {
    if (!SafeWebView) {
      setMapLoaded(true);
    }
  }, []);

  const syncAStarRoute = useMemo(() => {
    const uLat = userLocation?.latitude || activeGym.latitude + 0.002;
    const uLng = userLocation?.longitude || activeGym.longitude + 0.002;
    try {
      const grid = buildSpatialWaypointGrid(
        { latitude: uLat, longitude: uLng },
        { latitude: activeGym.latitude, longitude: activeGym.longitude },
        8
      );
      return findShortestPath(grid, 'start', 'goal', 'a-star', 1.0);
    } catch {
      return null;
    }
  }, [userLocation?.latitude, userLocation?.longitude, activeGym.latitude, activeGym.longitude]);

  const effectiveRoute = useMemo(() => {
    if (activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 2) {
      return activeRoute;
    }
    if (cachedAStarRouteRef.current && cachedAStarRouteRef.current.coordinates && cachedAStarRouteRef.current.coordinates.length > 2) {
      return cachedAStarRouteRef.current;
    }
    return activeRoute || syncAStarRoute;
  }, [activeRoute, syncAStarRoute]);

  const accurateDistance =
    activeRoute?.distanceFormatted ||
    aStarDistance ||
    cachedAStarRouteRef.current?.distanceFormatted ||
    syncAStarRoute?.distanceFormatted ||
    distanceFormatted;

  useEffect(() => {
    if (!userLocation) return;

    // OFFLINE GUARD: Never overwrite an existing high-detail A* route with a Haversine or fallback straight line when offline!
    if (!isOnline && cachedAStarRouteRef.current && cachedAStarRouteRef.current.coordinates.length > 2) {
      const remainingDist = calculateHaversineDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: activeGym.latitude, longitude: activeGym.longitude }
      );
      setAStarDistance(formatDistance(remainingDist));

      if (webViewRef.current && cachedAStarRouteRef.current.coordinates?.length) {
        const script = `
          if (window.displayNavigationRoute) {
            window.displayNavigationRoute(
              ${JSON.stringify(cachedAStarRouteRef.current.coordinates)},
              '${formatDistance(remainingDist)}',
              '${cachedAStarRouteRef.current.durationFormatted || '5 mins'}'
            );
          }
          true;
        `;
        webViewRef.current.injectJavaScript?.(script);
      }
      return;
    }

    if (lastAStarCoordRef.current) {
      const dist = calculateHaversineDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: lastAStarCoordRef.current.lat, longitude: lastAStarCoordRef.current.lng }
      );
      if (dist < 20 && aStarDistance) {
        return;
      }
    }

    lastAStarCoordRef.current = { lat: userLocation.latitude, lng: userLocation.longitude };

    let isMounted = true;
    calculateShortestPathRoute(
      userLocation,
      {
        latitude: activeGym.latitude,
        longitude: activeGym.longitude,
        name: activeGym.gymName,
      },
      { algorithm: 'a-star' }
    ).then((route) => {
      if (isMounted && route?.distanceFormatted) {
        // If route has only 2 points (straight line fallback) and we already have a detailed cached A* route, keep the cached route!
        if (route.coordinates.length <= 2 && cachedAStarRouteRef.current && cachedAStarRouteRef.current.coordinates.length > 2) {
          return;
        }

        if (route.coordinates.length > 2) {
          cachedAStarRouteRef.current = route;
        }

        setAStarDistance(route.distanceFormatted);
        setAStarDuration(route.durationFormatted);
        setActiveRoute(route);

        if (webViewRef.current && route.coordinates?.length) {
          const script = `
            if (window.displayNavigationRoute) {
              window.displayNavigationRoute(
                ${JSON.stringify(route.coordinates)},
                '${route.distanceFormatted}',
                '${route.durationFormatted}'
              );
            }
            true;
          `;
          webViewRef.current.injectJavaScript?.(script);
        }
      }
    }).catch(() => {
    });

    return () => {
      isMounted = false;
    };
  }, [userLocation?.latitude, userLocation?.longitude, activeGym.latitude, activeGym.longitude, isOnline]);

  useEffect(() => {
    if (mapLoaded && webViewRef.current && effectiveRoute?.coordinates?.length) {
      const script = `
        if (window.displayNavigationRoute) {
          window.displayNavigationRoute(
            ${JSON.stringify(effectiveRoute.coordinates)},
            '${effectiveRoute.distanceFormatted}',
            '${effectiveRoute.durationFormatted}'
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript?.(script);
    }
  }, [mapLoaded, effectiveRoute?.coordinates]);

  useEffect(() => {
    if (mapLoaded && userLocation && webViewRef.current) {
      const script = `
        if (window.updatePositions) {
          window.updatePositions(
            ${userLocation.latitude},
            ${userLocation.longitude},
            ${activeGym.latitude},
            ${activeGym.longitude},
            ${radiusMeters},
            ${isInside},
            '${accurateDistance}',
            ${heading || bearingDegrees || 0}
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript?.(script);
    }
  }, [mapLoaded, userLocation, activeGym, radiusMeters, isInside, accurateDistance, heading, bearingDegrees]);

  const handleCenterUser = async () => {
    triggerSelectionHaptic();
    if (userLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.updatePositions) {
          window.updatePositions(
            ${userLocation.latitude},
            ${userLocation.longitude},
            ${activeGym.latitude},
            ${activeGym.longitude},
            ${radiusMeters},
            ${isInside},
            '${accurateDistance}',
            ${heading || bearingDegrees || 0}
          );
        }
        if (window.centerOnCoords) {
          window.centerOnCoords(${userLocation.latitude}, ${userLocation.longitude});
        } else if (window.centerOnUser) {
          window.centerOnUser();
        }
        true;
      `);
      toast.success(`Centered on GPS: ${userLocation.latitude.toFixed(5)}, ${userLocation.longitude.toFixed(5)}`);
      return;
    }
    toast.loading('Acquiring high-precision GPS lock...', 2000);
    const loc = await lockExactLocation();
    const targetLoc = loc || userLocation;
    if (targetLoc && webViewRef.current) {
      const updatedLocAccess = Boolean(targetLoc && isGpsEnabled && permissionStatus === 'granted');
      const freshDistMeters = Math.round(
        calculateHaversineDistance(
          { latitude: targetLoc.latitude, longitude: targetLoc.longitude },
          { latitude: activeGym.latitude, longitude: activeGym.longitude }
        )
      );
      const freshIsInside = freshDistMeters <= radiusMeters;
      const freshDistStr = formatDistance(freshDistMeters);

      webViewRef.current.injectJavaScript?.(`
        if (window.updatePositions) {
          window.updatePositions(
            ${targetLoc.latitude},
            ${targetLoc.longitude},
            ${activeGym.latitude},
            ${activeGym.longitude},
            ${radiusMeters},
            ${freshIsInside},
            '${freshDistStr}',
            ${targetLoc.heading || heading || bearingDegrees || 0}
          );
        }
        if (window.centerOnCoords) {
          window.centerOnCoords(${targetLoc.latitude}, ${targetLoc.longitude});
        } else if (window.centerOnUser) {
          window.centerOnUser();
        }
        if (window.setConnectionState) window.setConnectionState(${updatedLocAccess}, ${isOnline});
        else if (window.setGpsSignalState) window.setGpsSignalState(${updatedLocAccess}, ${isOnline});
        true;
      `);
      toast.success(`Locked GPS: ${targetLoc.latitude.toFixed(5)}, ${targetLoc.longitude.toFixed(5)}`);
    } else {
      toast.error('Could not get GPS lock. Please check location permissions.');
    }
  };

  const handleRefreshGps = useCallback(async () => {
    try {
      triggerSelectionHaptic();
      setIsRefreshingGps(true);
      toast.loading('Acquiring precise GPS lock...', 2000);

      const loc = await lockExactLocation();
      const targetLoc = loc || userLocation;
      const updatedLocAccess = Boolean(
        targetLoc &&
        isGpsEnabled &&
        permissionStatus === 'granted'
      );

      if (targetLoc) {
        const freshDistMeters = Math.round(
          calculateHaversineDistance(
            { latitude: targetLoc.latitude, longitude: targetLoc.longitude },
            { latitude: activeGym.latitude, longitude: activeGym.longitude }
          )
        );
        const freshIsInside = freshDistMeters <= radiusMeters;
        const freshDistStr = formatDistance(freshDistMeters);

        // Always calculate/preserve A* shortest route, NEVER revert to straight line
        let routeToUse: ShortestPathResult | null = null;

        if (isOnline) {
          try {
            const liveRoute = await calculateShortestPathRoute(
              targetLoc,
              {
                latitude: activeGym.latitude,
                longitude: activeGym.longitude,
                name: activeGym.gymName,
              },
              { algorithm: 'a-star' }
            );
            if (liveRoute && liveRoute.coordinates && liveRoute.coordinates.length > 2) {
              routeToUse = liveRoute;
              cachedAStarRouteRef.current = liveRoute;
            }
          } catch {}
        }

        // If offline or online failed, preserve existing cached detailed route with updated start position
        if (!routeToUse && cachedAStarRouteRef.current && cachedAStarRouteRef.current.coordinates.length > 2) {
          const updatedCoords = [...cachedAStarRouteRef.current.coordinates];
          updatedCoords[0] = [targetLoc.latitude, targetLoc.longitude];
          routeToUse = {
            ...cachedAStarRouteRef.current,
            coordinates: updatedCoords,
            totalDistanceMeters: freshDistMeters,
            distanceFormatted: freshDistStr,
          };
          cachedAStarRouteRef.current = routeToUse;
        }

        // Fallback: Compute high-precision A* route on spatial waypoint grid
        if (!routeToUse) {
          try {
            const grid = buildSpatialWaypointGrid(
              { latitude: targetLoc.latitude, longitude: targetLoc.longitude },
              { latitude: activeGym.latitude, longitude: activeGym.longitude },
              8
            );
            const gridRoute = findShortestPath(grid, 'start', 'goal', 'a-star', 1.0);
            if (gridRoute) {
              routeToUse = gridRoute;
              cachedAStarRouteRef.current = gridRoute;
            }
          } catch {}
        }

        if (routeToUse) {
          setActiveRoute(routeToUse);
          setAStarDistance(routeToUse.distanceFormatted);
          setAStarDuration(routeToUse.durationFormatted);

          if (webViewRef.current) {
            webViewRef.current.injectJavaScript?.(`
              if (window.displayNavigationRoute) {
                window.displayNavigationRoute(
                  ${JSON.stringify(routeToUse.coordinates)},
                  '${routeToUse.distanceFormatted}',
                  '${routeToUse.durationFormatted}',
                  false
                );
              }
              true;
            `);
          }
        }

        if (webViewRef.current) {
          webViewRef.current.injectJavaScript?.(`
            if (window.updatePositions) {
              window.updatePositions(
                ${targetLoc.latitude},
                ${targetLoc.longitude},
                ${activeGym.latitude},
                ${activeGym.longitude},
                ${radiusMeters},
                ${freshIsInside},
                '${freshDistStr}',
                ${targetLoc.heading || heading || bearingDegrees || 0}
              );
            }
            if (window.centerOnCoords) {
              window.centerOnCoords(${targetLoc.latitude}, ${targetLoc.longitude});
            } else if (window.centerOnUser) {
              window.centerOnUser();
            }
            if (window.reloadMapTiles) window.reloadMapTiles();
            if (window.setConnectionState) window.setConnectionState(${updatedLocAccess}, ${isOnline});
            else if (window.setGpsSignalState) window.setGpsSignalState(${updatedLocAccess}, ${isOnline});
            true;
          `);
        }

        if (!isOnline) {
          toast.success(`GPS locked (${targetLoc.latitude.toFixed(5)}, ${targetLoc.longitude.toFixed(5)}) - Map in B&W (No Internet)`);
        } else {
          toast.success(`GPS locked! Accurate location: ${targetLoc.latitude.toFixed(5)}, ${targetLoc.longitude.toFixed(5)}`);
        }
      } else {
        toast.error('Could not acquire precise GPS satellite fix.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to refresh GPS connection');
    } finally {
      setIsRefreshingGps(false);
    }
  }, [lockExactLocation, userLocation, isOnline, isGpsEnabled, permissionStatus, activeGym, radiusMeters, heading, bearingDegrees]);

  const handleCenterGym = () => {
    triggerSelectionHaptic();
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.centerOnGym) window.centerOnGym();
        true;
      `);
    }
  };

  const handleFitBounds = () => {
    triggerSelectionHaptic();
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.fitBoth) window.fitBoth();
        true;
      `);
    }
  };

  const handleZoomIn = () => {
    triggerSelectionHaptic();
    setVectorZoom((prev) => Math.min(prev + 0.35, 3.5));
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.zoomInMap) window.zoomInMap();
        true;
      `);
    }
  };

  const handleZoomOut = () => {
    triggerSelectionHaptic();
    setVectorZoom((prev) => Math.max(prev - 0.35, 0.35));
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.zoomOutMap) window.zoomOutMap();
        true;
      `);
    }
  };

  const handleSwitchLayer = (layer: 'traffic' | 'streets' | 'satellite') => {
    triggerSelectionHaptic();
    setActiveLayer(layer);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.switchLayer) window.switchLayer('${layer}');
        true;
      `);
    }
  };

  const handleOpenDefaultExternalMaps = () => {
    triggerLightHaptic();
    setShowDirectionsSheet(false);

    const query = encodeURIComponent(`${activeGym.gymName}, ${activeGym.address || ''}, ${activeGym.city || ''}`);
    const destCoords = `${activeGym.latitude},${activeGym.longitude}`;

    const url = Platform.select({
      ios: `maps:0,0?q=${query}&daddr=${destCoords}`,
      android: `geo:0,0?q=${destCoords}(${query})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destCoords}`,
    });

    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destCoords}`);
    });
  };

  const handleStartInAppNavigation = async () => {
    if (!userLocation) {
      toast.error('Waiting for GPS lock before computing shortest path...');
      return;
    }

    triggerSelectionHaptic();
    setShowDirectionsSheet(false);

    // Use immediately available route (activeRoute, cachedAStarRoute, or precalculated syncAStarRoute)
    const route = activeRoute || cachedAStarRouteRef.current || effectiveRoute;

    if (route) {
      if (route.coordinates && route.coordinates.length > 2) {
        cachedAStarRouteRef.current = route;
      }
      setActiveRoute(route);
      setAStarDistance(route.distanceFormatted);
      setAStarDuration(route.durationFormatted);
      setCurrentStepIndex(0);
      setIsNavigating(true);
      triggerSuccessHaptic();
      toast.success('Starting navigation! Saving route map to device...');

      const firstStep = route.steps?.[0]?.instruction || `Head towards ${activeGym.gymName}`;
      const voiceText = `Starting navigation to ${activeGym.gymName}. ${firstStep}. Total distance: ${route.distanceFormatted}.`;

      // Announce immediately with ZERO delay at the exact time navigation starts
      speakGuidance(voiceText);

      if (webViewRef.current) {
        const script = `
          if (window.displayNavigationRoute) {
            window.displayNavigationRoute(
              ${JSON.stringify(route.coordinates)},
              '${route.distanceFormatted}',
              '${route.durationFormatted}'
            );
          }
          if (window.preloadRouteTiles) {
            window.preloadRouteTiles(${JSON.stringify(route.coordinates)});
          }
          true;
        `;
        webViewRef.current.injectJavaScript?.(script);
      }
    } else {
      setIsCalculatingRoute(true);
      try {
        const calculated = await calculateShortestPathRoute(
          userLocation,
          {
            latitude: activeGym.latitude,
            longitude: activeGym.longitude,
            name: activeGym.gymName,
          },
          { algorithm: 'a-star' }
        );
        if (calculated) {
          if (calculated.coordinates && calculated.coordinates.length > 2) {
            cachedAStarRouteRef.current = calculated;
          }
          setActiveRoute(calculated);
          setAStarDistance(calculated.distanceFormatted);
          setAStarDuration(calculated.durationFormatted);
          setCurrentStepIndex(0);
          setIsNavigating(true);
          triggerSuccessHaptic();
          toast.success('Starting navigation! Saving route map to device...');

          const firstStep = calculated.steps?.[0]?.instruction || `Head towards destination`;
          // Announce immediately with ZERO delay at the exact time navigation starts
          speakGuidance(`Starting navigation to ${activeGym.gymName}. ${firstStep}. Remaining distance: ${calculated.distanceFormatted}.`);

          if (webViewRef.current) {
            webViewRef.current.injectJavaScript?.(`
              if (window.displayNavigationRoute) {
                window.displayNavigationRoute(
                  ${JSON.stringify(calculated.coordinates)},
                  '${calculated.distanceFormatted}',
                  '${calculated.durationFormatted}'
                );
              }
              if (window.preloadRouteTiles) {
                window.preloadRouteTiles(${JSON.stringify(calculated.coordinates)});
              }
              true;
            `);
          }
        }
      } catch {
        toast.error('Failed to calculate shortest path route.');
      } finally {
        setIsCalculatingRoute(false);
      }
    }
  };

  const handleStopNavigation = () => {
    triggerLightHaptic();
    setIsNavigating(false);
    Speech.stop();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.clearOfflineTiles) window.clearOfflineTiles();
        if (window.clearNavigationRoute) window.clearNavigationRoute();
        if (window.fitBoth) window.fitBoth();
        true;
      `);
    }
    toast.success('Navigation ended. Cached route map cleared from device.');
  };

  const handleNextStep = () => {
    if (!activeRoute?.steps) return;
    triggerLightHaptic();
    const nextIdx = Math.min(currentStepIndex + 1, activeRoute.steps.length - 1);
    setCurrentStepIndex(nextIdx);
    const step = activeRoute.steps[nextIdx];
    if (step) {
      speakGuidance(`${step.instruction}. In ${step.distanceFormatted}.`);
    }
  };

  const handlePrevStep = () => {
    if (!activeRoute?.steps) return;
    triggerLightHaptic();
    const prevIdx = Math.max(currentStepIndex - 1, 0);
    setCurrentStepIndex(prevIdx);
    const step = activeRoute.steps[prevIdx];
    if (step) {
      speakGuidance(`${step.instruction}. In ${step.distanceFormatted}.`);
    }
  };

  const handleReplayAudio = () => {
    triggerSelectionHaptic();
    if (!activeRoute?.steps || !activeRoute.steps[currentStepIndex]) {
      speakGuidance(`Head towards ${activeGym.gymName}. Remaining distance: ${accurateDistance}.`);
      return;
    }
    const step = activeRoute.steps[currentStepIndex];
    speakGuidance(`${step.instruction}. In ${step.distanceFormatted}.`);
  };

  const handleToggleVoice = () => {
    triggerSelectionHaptic();
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);

    if (next) {
      toast.success('Voice navigation guidance enabled');
      speakGuidance('Voice guidance enabled');
    } else {
      try {
        Speech.stop();
      } catch { }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      toast.success('Voice navigation guidance muted');
    }
  };

  const handleGeofenceCheckIn = () => {
    if (!isInside) {
      toast.error('You must be within 100m of the gym to check in via Geofence.');
      return;
    }
    triggerSuccessHaptic();
    toast.success(`Check-in verified at ${activeGym.gymName}!`);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.clearOfflineTiles) window.clearOfflineTiles();
        true;
      `);
    }
    onCheckInSuccess?.();
  };

  const handleCloseModal = () => {
    triggerLightHaptic();
    Speech.stop();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript?.(`
        if (window.clearOfflineTiles) window.clearOfflineTiles();
        true;
      `);
    }
    onClose();
  };

  useEffect(() => {
    if (!isNavigating || !userLocation || !activeRoute?.steps || activeRoute.steps.length === 0) return;

    const currStep = activeRoute.steps[currentStepIndex];
    if (!currStep) return;

    const distToStep = calculateHaversineDistance(
      userLocation,
      { latitude: currStep.coordinate[0], longitude: currStep.coordinate[1] }
    );

    if (distToStep < 25 && currentStepIndex < activeRoute.steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextStep = activeRoute.steps[nextIdx];
      if (nextStep) {
        speakGuidance(`${nextStep.instruction}. In ${nextStep.distanceFormatted}.`);
      }
    }
  }, [userLocation?.latitude, userLocation?.longitude, isNavigating, currentStepIndex, activeRoute]);

  const handleOpenBrowserMap = async () => {
    triggerSelectionHaptic();
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${activeGym.latitude},${activeGym.longitude}`;
    await WebBrowser.openBrowserAsync(mapUrl);
  };

  useEffect(() => {
    if (webViewRef.current && mapLoaded) {
      webViewRef.current.injectJavaScript?.(`
        if (window.setConnectionState) {
          window.setConnectionState(${hasLocationAccess}, ${isOnline});
        } else if (window.setGpsSignalState) {
          window.setGpsSignalState(${hasLocationAccess}, ${isOnline});
        }
        true;
      `);
    }
  }, [hasLocationAccess, isOnline, mapLoaded]);

  const initialMapHtml = useMemo(() => {
    return generateMapHtml({
      activeGym,
      userLocation: (userLocation || initialUserLocation) || null,
      heading,
      bearingDegrees,
      accurateDistance,
      radiusMeters,
      routeToDisplay: effectiveRoute,
      pointerColor: POINTER_COLOR,
      hasGpsSignal,
    });
  }, [activeGym.gymId, activeGym.latitude, activeGym.longitude]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={handleCloseModal}
    >
      <View style={{ flex: 1, backgroundColor: '#090A0C' }}>
        <View
          style={{ paddingTop: Math.max(insets.top, 14) }}
          className="bg-[#121316] border-b border-[#222328] px-4 pb-3 z-30"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={handleCloseModal}
              className="w-10 h-10 rounded-full bg-[#1A1C20] border border-[#2B2D33] items-center justify-center active:opacity-70"
            >
              <X size={18} color="#FFFFFF" weight="bold" />
            </Pressable>

            <View className="flex-1 items-center px-3">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {activeGym.gymName}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <MapPin size={12} color="#CCFF00" weight="fill" />
                <Text className="text-[#8E929A] text-xs font-medium" numberOfLines={1}>
                  {activeGym.address ? `${activeGym.address}, ` : ''}{activeGym.city || ''} {activeGym.pinCode ? `(PIN: ${activeGym.pinCode})` : ''}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center bg-[#18191E] border border-[#2B2D33] px-2.5 py-1.5 rounded-full">
              <View
                className={`w-2 h-2 rounded-full mr-1.5 ${wsStatus === 'CONNECTED'
                  ? 'bg-[#CCFF00]'
                  : wsStatus === 'CONNECTING'
                    ? 'bg-amber-400'
                    : 'bg-red-500'
                  }`}
              />
              <Text className="text-[#8E929A] text-[10px] font-semibold uppercase">
                {wsStatus === 'CONNECTED' ? 'Live' : wsStatus}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1 relative bg-[#090A0C]">
          {/* Non-intrusive GPS Warning Banner positioned below controls so it never covers left/right action icons */}
          {!hasGpsSignal && (
            <View
              style={{
                position: 'absolute',
                top: isNavigating ? 218 : 68,
                alignSelf: 'center',
                maxWidth: '85%',
                zIndex: 35,
                elevation: 35,
                alignItems: 'center',
              }}
              pointerEvents="none"
            >
              <View className="bg-[#141519]/95 border border-red-500/90 px-3.5 py-2 rounded-2xl shadow-2xl flex-row items-center gap-2">
                <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <Text className="text-red-400 text-xs font-semibold tracking-wider uppercase">
                  {!isGpsEnabled || permissionStatus !== 'granted'
                    ? '⚠️ DEVICE LOCATION DISABLED • TURN ON GPS'
                    : '⚠️ GPS SIGNAL LOST • SEARCHING...'}
                </Text>
              </View>
            </View>
          )}

          {/* Prevent static fallback map from flashing on initial load; show loading icon until map is completely ready */}
          {!mapLoaded && (
            <View className="absolute inset-0 bg-[#090A0C] items-center justify-center z-50 px-6">
              <View className="w-16 h-16 rounded-3xl bg-[#141519] border border-[#2B2D33] items-center justify-center mb-4 shadow-2xl">
                <ActivityIndicator size="large" color="#CCFF00" />
              </View>
              <Text className="text-white text-base font-semibold">Loading Map View...</Text>
              <Text className="text-[#8E929A] text-xs text-center mt-1">
                Acquiring live street coordinates & route...
              </Text>
            </View>
          )}

          {SafeWebView ? (
            <>
              <SafeWebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: initialMapHtml }}
                style={{ flex: 1, backgroundColor: '#090A0C' }}
                onMessage={(event: any) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data?.type === 'MAP_READY') {
                      setMapLoaded(true);
                    } else if (data?.type === 'TILES_PRELOADED') {
                      toast.success(`Route map stored! (${data.count} tiles cached)`);
                    } else if (data?.type === 'INTERNET_RESTORED') {
                      toast.success('Internet restored! Live map reloaded.');
                    }
                  } catch {
                  }
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                cacheEnabled={true}
                cacheMode="LOAD_DEFAULT"
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                mixedContentMode="always"
                startInLoadingState={false}
                scalesPageToFit={true}
              />
            </>
          ) : (
            <NativeVectorMap
              activeGym={activeGym}
              userLocation={userLocation}
              isInside={isInside}
              isNavigating={isNavigating}
              accurateDistance={accurateDistance}
              heading={heading}
              bearingDegrees={bearingDegrees}
              headingDirection={headingDirection}
              compassDirection={compassDirection}
              hasGpsSignal={hasGpsSignal}
              onOpenBrowserMap={handleOpenBrowserMap}
              vectorZoom={vectorZoom}
            />
          )}

          {isNavigating && activeRoute && (
            <NavigationTurnHud
              activeGym={activeGym}
              activeRoute={activeRoute}
              currentStepIndex={currentStepIndex}
              accurateDistance={accurateDistance}
              heading={heading}
              bearingDegrees={bearingDegrees}
              headingDirection={headingDirection}
              compassDirection={compassDirection}
              isVoiceEnabled={isVoiceEnabled}
              onToggleVoice={handleToggleVoice}
              onStopNavigation={handleStopNavigation}
              onReplayAudio={handleReplayAudio}
              onNextStep={handleNextStep}
              onPrevStep={handlePrevStep}
              onCenterUser={handleCenterUser}
              isLockingGps={isLockingGps}
            />
          )}

          <FloatingMapActions
            isNavigating={isNavigating}
            safeWebView={Boolean(SafeWebView)}
            activeLayer={activeLayer}
            onSwitchLayer={handleSwitchLayer}
            isLockingGps={isLockingGps}
            onCenterUser={handleCenterUser}
            onCenterGym={handleCenterGym}
            onFitBounds={handleFitBounds}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            headingDirection={headingDirection}
            isVoiceEnabled={isVoiceEnabled}
            onToggleVoice={handleToggleVoice}
            showSimControls={showSimControls}
            onToggleSimControls={() => {
              triggerSelectionHaptic();
              setShowSimControls((prev) => !prev);
            }}
            isRefreshingGps={isRefreshingGps}
            onRefreshGps={handleRefreshGps}
          />

          {showSimControls && (
            <SimulatorDrawer
              isSimulated={isSimulated}
              isNavigating={isNavigating}
              onResetSimulation={resetSimulation}
              onSimulatePosition={simulatePosition}
              onClose={() => setShowSimControls(false)}
            />
          )}

          <GeofenceMetricsHud
            insetsBottom={insets.bottom}
            isInside={isInside}
            status={status}
            isSimulated={isSimulated}
            wsMetrics={wsMetrics}
            accurateDistance={accurateDistance}
            heading={heading}
            bearingDegrees={bearingDegrees}
            headingDirection={headingDirection}
            compassDirection={compassDirection}
            radiusMeters={radiusMeters}
            dwellSeconds={dwellSeconds}
            isNavigating={isNavigating}
            onOpenDirections={() => {
              triggerSelectionHaptic();
              setShowDirectionsSheet(true);
            }}
            onStopNavigation={handleStopNavigation}
            onGeofenceCheckIn={handleGeofenceCheckIn}
          />
        </View>

        <DirectionsSheetModal
          visible={showDirectionsSheet}
          insetsBottom={insets.bottom}
          activeGym={activeGym}
          isCalculatingRoute={isCalculatingRoute}
          onClose={() => setShowDirectionsSheet(false)}
          onStartInAppNavigation={handleStartInAppNavigation}
          onOpenDefaultExternalMaps={handleOpenDefaultExternalMaps}
        />
      </View>
    </Modal>
  );
}

export default GeofenceMapViewModal;
