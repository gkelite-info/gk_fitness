/**
 * GK Fitness Geofencing Algorithm Engine
 * 
 * Implements high-precision geodetic distance calculations (Haversine formula),
 * forward azimuth / bearing calculations, point-in-polygon ray casting,
 * jitter-smoothing filter, and geofence state transition tracking.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface GeofenceCircle {
  id?: string;
  name?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // e.g. 100 meters
}

export type GeofenceStatus = 'INSIDE' | 'NEARBY' | 'OUTSIDE';

export type GeofenceTransitionEvent = 
  | 'INITIAL'
  | 'GEOFENCE_ENTER'
  | 'GEOFENCE_EXIT'
  | 'GEOFENCE_DWELL'
  | 'LOCATION_UPDATE';

export interface GeofenceEvaluationResult {
  isInside: boolean;
  status: GeofenceStatus;
  distanceMeters: number;
  distanceFormatted: string;
  bearingDegrees: number;
  compassDirection: string;
  radiusMeters: number;
  proximityRatio: number; // <= 1 is inside, > 1 is outside
  accuracy: number | null;
  timestamp: number;
}

const EARTH_RADIUS_METERS = 6371000; // Mean radius of the Earth in meters

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Haversine Formula for high-precision Great Circle distance calculation in meters.
 * Accuracy: ~0.3% error over typical distances.
 */
export function calculateHaversineDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const phi1 = toRadians(coord1.latitude);
  const phi2 = toRadians(coord2.latitude);
  const deltaPhi = toRadians(coord2.latitude - coord1.latitude);
  const deltaLambda = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10; // 1 decimal place in meters
}

/**
 * Forward Azimuth (Bearing) Calculation from point A to point B in degrees (0° - 360°).
 */
export function calculateBearing(
  start: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number }
): number {
  const phi1 = toRadians(start.latitude);
  const phi2 = toRadians(target.latitude);
  const deltaLambda = toRadians(target.longitude - start.longitude);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const bearing = (toDegrees(theta) + 360) % 360;

  return Math.round(bearing);
}

/**
 * Converts a numerical bearing (0° - 360°) to a human-readable 16-point cardinal direction.
 */
export function getCompassDirection(bearingDegrees: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'
  ];
  const index = Math.round((bearingDegrees % 360) / 22.5);
  return directions[index] || 'N';
}

/**
 * Format meters to human-readable string (e.g. "45 m" or "1.2 km")
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

/**
 * Ray-Casting algorithm to evaluate whether a point is inside a polygon geofence.
 * Useful for irregular gym boundaries, campus perimeters, or outdoor zones.
 */
export function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: Array<{ latitude: number; longitude: number }>
): boolean {
  let inside = false;
  const n = polygon.length;
  if (n < 3) return false;

  const x = point.longitude;
  const y = point.latitude;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Core Geofence Evaluation Algorithm:
 * Evaluates user location against a geofence circle and calculates distance,
 * inside/outside status, bearing, and proximity ratio.
 * 
 * @param userCoord Current coordinates of the user
 * @param geofence Target geofence parameters (latitude, longitude, radiusMeters)
 * @param nearbyThresholdMultiplier Multiplier of radius considered "nearby" (default: 3x)
 */
export function evaluateGeofence(
  userCoord: Coordinates,
  geofence: GeofenceCircle,
  nearbyThresholdMultiplier: number = 3
): GeofenceEvaluationResult {
  const distance = calculateHaversineDistance(userCoord, geofence);
  const radius = geofence.radiusMeters || 100;
  const bearing = calculateBearing(userCoord, geofence);
  const compass = getCompassDirection(bearing);

  const isInside = distance <= radius;
  let status: GeofenceStatus = 'OUTSIDE';

  if (isInside) {
    status = 'INSIDE';
  } else if (distance <= radius * nearbyThresholdMultiplier) {
    status = 'NEARBY';
  } else {
    status = 'OUTSIDE';
  }

  const proximityRatio = Math.round((distance / radius) * 100) / 100;

  return {
    isInside,
    status,
    distanceMeters: distance,
    distanceFormatted: formatDistance(distance),
    bearingDegrees: bearing,
    compassDirection: compass,
    radiusMeters: radius,
    proximityRatio,
    accuracy: userCoord.accuracy ?? null,
    timestamp: userCoord.timestamp || Date.now(),
  };
}

/**
 * Smooths heading values across the 0° / 360° circular boundary.
 */
export function smoothHeading(prevHeading: number | null, newHeading: number, alpha = 0.3): number {
  if (prevHeading === null || isNaN(prevHeading)) return Math.round(newHeading);
  let diff = (newHeading - prevHeading + 540) % 360 - 180;
  const smoothed = (prevHeading + diff * alpha + 360) % 360;
  return Math.round(smoothed);
}

/**
 * Adaptive Kalman & Stationary Deadband GPS coordinate filter.
 * Completely eliminates standing jitter ("moving here and there"),
 * filters out low-accuracy drift, and smoothly responds to true motion.
 */
export class GPSFilter {
  private lat: number | null = null;
  private lng: number | null = null;
  private variance: number = -1; // Current estimation variance
  private lastTimestamp: number = 0;
  private bestAccuracy: number = Infinity;
  private isStationaryStreak: number = 0;

  // Process noise (Q): lower means trust model more, higher means trust GPS measurements more
  private readonly processNoise: number;
  // Stationary displacement threshold (meters): suppress noise when standing still
  private readonly deadbandMeters: number;

  constructor(processNoise: number = 3.0, deadbandMeters: number = 6.0) {
    this.processNoise = processNoise;
    this.deadbandMeters = deadbandMeters;
  }

  /**
   * Filter an incoming raw coordinate through the adaptive Kalman filter.
   */
  filter(coord: Coordinates): Coordinates {
    const accuracy = Math.max(1, coord.accuracy || 15);
    const timestamp = coord.timestamp || Date.now();

    // 1. Initial fix
    if (this.lat === null || this.lng === null || this.variance < 0) {
      this.lat = coord.latitude;
      this.lng = coord.longitude;
      this.variance = accuracy * accuracy;
      this.lastTimestamp = timestamp;
      this.bestAccuracy = accuracy;
      return {
        ...coord,
        latitude: this.lat,
        longitude: this.lng,
      };
    }

    const elapsedSeconds = Math.max(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    // 2. Reject extreme outliers: if accuracy is terrible (> 55m) and we already have high accuracy
    if (accuracy > 55 && this.bestAccuracy < 25) {
      return {
        ...coord,
        latitude: this.lat,
        longitude: this.lng,
        accuracy: this.bestAccuracy,
      };
    }

    // 3. Stationary Deadband Jitter Suppression
    // Calculate distance between new raw coordinate and current filtered coordinate
    const deltaMeters = calculateHaversineDistance(
      { latitude: this.lat, longitude: this.lng },
      { latitude: coord.latitude, longitude: coord.longitude }
    );

    const isExplicitlyStationary = coord.speed !== null && coord.speed !== undefined && coord.speed < 0.6;
    const dynamicDeadband = Math.max(this.deadbandMeters, accuracy * 0.45);

    // If movement is smaller than deadband and speed is stationary, suppress jitter completely!
    if (deltaMeters < dynamicDeadband && (isExplicitlyStationary || deltaMeters < 4.5)) {
      this.isStationaryStreak++;
      // High-confidence stationary lock: update variance slightly without shifting position
      this.variance = Math.max(4, this.variance * 0.95);
      return {
        ...coord,
        latitude: this.lat,
        longitude: this.lng,
        accuracy: Math.min(accuracy, this.bestAccuracy),
      };
    }

    this.isStationaryStreak = 0;

    // 4. Kalman Filter Time Update (Prediction)
    this.variance += this.processNoise * elapsedSeconds;

    // 5. Kalman Filter Measurement Update
    const measurementVariance = accuracy * accuracy;
    const kalmanGain = this.variance / (this.variance + measurementVariance);

    this.lat += kalmanGain * (coord.latitude - this.lat);
    this.lng += kalmanGain * (coord.longitude - this.lng);
    this.variance = (1 - kalmanGain) * this.variance;

    if (accuracy < this.bestAccuracy) {
      this.bestAccuracy = accuracy;
    }

    return {
      ...coord,
      latitude: this.lat,
      longitude: this.lng,
      accuracy: Math.round(Math.sqrt(this.variance)),
    };
  }

  /**
   * Instantly re-anchors the filter to an explicit high-accuracy lock
   * (e.g. when the user taps the target icon).
   */
  forceReset(coord: Coordinates): void {
    this.lat = coord.latitude;
    this.lng = coord.longitude;
    const acc = Math.max(1, coord.accuracy || 5);
    this.variance = acc * acc;
    this.bestAccuracy = acc;
    this.lastTimestamp = coord.timestamp || Date.now();
    this.isStationaryStreak = 0;
  }

  reset(): void {
    this.lat = null;
    this.lng = null;
    this.variance = -1;
    this.lastTimestamp = 0;
    this.bestAccuracy = Infinity;
    this.isStationaryStreak = 0;
  }
}

/**
 * Geofence State Machine Tracker
 * Detects state transitions: ENTER, EXIT, DWELL
 */
export class GeofenceStateTracker {
  private lastState: GeofenceStatus | null = null;
  private insideSince: number | null = null;

  processEvaluation(evalResult: GeofenceEvaluationResult): {
    event: GeofenceTransitionEvent;
    dwellSeconds: number;
  } {
    const now = Date.now();
    let event: GeofenceTransitionEvent = 'LOCATION_UPDATE';
    let dwellSeconds = 0;

    if (this.lastState === null) {
      this.lastState = evalResult.status;
      if (evalResult.isInside) {
        this.insideSince = now;
        event = 'GEOFENCE_ENTER';
      } else {
        event = 'INITIAL';
      }
      return { event, dwellSeconds: 0 };
    }

    if (!this.lastState.includes('INSIDE') && evalResult.isInside) {
      // Just entered
      this.insideSince = now;
      event = 'GEOFENCE_ENTER';
    } else if (this.lastState === 'INSIDE' && !evalResult.isInside) {
      // Just exited
      this.insideSince = null;
      event = 'GEOFENCE_EXIT';
    } else if (evalResult.isInside && this.insideSince) {
      // Still inside (dwelling)
      dwellSeconds = Math.floor((now - this.insideSince) / 1000);
      event = 'GEOFENCE_DWELL';
    }

    this.lastState = evalResult.status;
    return { event, dwellSeconds };
  }

  reset() {
    this.lastState = null;
    this.insideSince = null;
  }
}
