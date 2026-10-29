import { NativeModules, Platform, DeviceEventEmitter, EmitterSubscription } from 'react-native';
import {
  WatchWorkoutPayload,
  WatchSetLog,
  WatchWorkoutSummary,
  WatchHeartRateLog,
  WatchConnectionStatus,
  WATCH_DATA_PATHS,
} from './watchTypes';

const { WatchBridgeModule } = NativeModules;

class WatchBridgeService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = Platform.OS === 'android' && !!WatchBridgeModule;
  }

  /**
   * Checks if a paired smartwatch (Wear OS) is currently connected and reachable.
   */
  async getConnectionStatus(): Promise<WatchConnectionStatus> {
    if (!this.isAvailable) {
      return {
        isPaired: false,
        isReachable: false,
        deviceName: null,
        nodeId: null,
        platform: Platform.OS === 'android' ? 'wearos' : Platform.OS === 'ios' ? 'watchos' : 'none',
      };
    }

    try {
      return await WatchBridgeModule.getConnectionStatus();
    } catch (e) {
      console.warn('[WatchBridge] getConnectionStatus error:', e);
      return {
        isPaired: false,
        isReachable: false,
        platform: 'wearos',
      };
    }
  }

  /**
   * Pushes the active workout session payload to the connected watch via Wearable DataClient.
   */
  async pushWorkoutToWatch(payload: WatchWorkoutPayload): Promise<boolean> {
    if (!this.isAvailable) {
      console.log('[WatchBridge] Native module unavailable, simulated pushWorkoutToWatch:', payload.workoutType);
      return false;
    }

    try {
      const payloadString = JSON.stringify(payload);
      return await WatchBridgeModule.pushWorkoutPayload(WATCH_DATA_PATHS.WORKOUT_SESSION, payloadString);
    } catch (e) {
      console.error('[WatchBridge] pushWorkoutToWatch failed:', e);
      return false;
    }
  }

  /**
   * Sends a ping/heartbeat message to test watch responsiveness.
   */
  async pingWatch(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await WatchBridgeModule.sendMessage(WATCH_DATA_PATHS.HEARTBEAT, 'PING');
    } catch (e) {
      console.warn('[WatchBridge] pingWatch failed:', e);
      return false;
    }
  }

  /**
   * Subscribes to set completion events received from the watch.
   */
  onSetLogReceived(callback: (log: WatchSetLog) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_SetLogReceived', (data: string | WatchSetLog) => {
      try {
        const parsed: WatchSetLog = typeof data === 'string' ? JSON.parse(data) : data;
        callback(parsed);
      } catch (err) {
        console.error('[WatchBridge] Failed to parse set log event:', err);
      }
    });
  }

  /**
   * Subscribes to workout completion summary events received from the watch.
   */
  onWorkoutComplete(callback: (summary: WatchWorkoutSummary) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_WorkoutComplete', (data: string | WatchWorkoutSummary) => {
      try {
        const parsed: WatchWorkoutSummary = typeof data === 'string' ? JSON.parse(data) : data;
        callback(parsed);
      } catch (err) {
        console.error('[WatchBridge] Failed to parse workout complete event:', err);
      }
    });
  }

  /**
   * Subscribes to live heart rate logs sent from watch sensors.
   */
  onHeartRateReceived(callback: (hrLog: WatchHeartRateLog) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_HeartRateReceived', (data: string | WatchHeartRateLog) => {
      try {
        const parsed: WatchHeartRateLog = typeof data === 'string' ? JSON.parse(data) : data;
        callback(parsed);
      } catch (err) {
        console.error('[WatchBridge] Failed to parse heart rate event:', err);
      }
    });
  }
}

export const watchBridge = new WatchBridgeService();
