import { NativeModules, Platform, DeviceEventEmitter, EmitterSubscription } from 'react-native';
import {
  WatchWorkoutPayload,
  WatchSetLog,
  WatchWorkoutSummary,
  WatchHeartRateLog,
  WatchWaterLog,
  WatchAuthSession,
  WatchStepSync,
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
        isNativeModuleAvailable: false,
        deviceName: null,
        nodeId: null,
        platform: Platform.OS === 'android' ? 'wearos' : Platform.OS === 'ios' ? 'watchos' : 'none',
      };
    }

    try {
      const res = await WatchBridgeModule.getConnectionStatus();
      return {
        ...res,
        isNativeModuleAvailable: true,
      };
    } catch (e) {
      console.warn('[WatchBridge] getConnectionStatus error:', e);
      return {
        isPaired: false,
        isReachable: false,
        isNativeModuleAvailable: true,
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

  /**
   * Subscribes to water logs logged on the smartwatch.
   */
  onWaterLogReceived(callback: (log: WatchWaterLog) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_WaterLogReceived', (data: string | WatchWaterLog) => {
      try {
        const parsed: WatchWaterLog = typeof data === 'string' ? JSON.parse(data) : data;
        callback(parsed);
      } catch (err) {
        console.error('[WatchBridge] Failed to parse water log event:', err);
      }
    });
  }

  /**
   * Subscribes to smartwatch requesting active workout sync.
   */
  onRequestActiveWorkout(callback: () => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_RequestActiveWorkout', () => {
      callback();
    });
  }

  /**
   * Pushes user auth session / profile to watch so watch knows who is logged in.
   */
  async pushAuthSessionToWatch(session: WatchAuthSession): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      if (WatchBridgeModule && typeof WatchBridgeModule.pushAuthSession === 'function') {
        return await WatchBridgeModule.pushAuthSession(JSON.stringify(session));
      }
      return false;
    } catch (e) {
      console.warn('[WatchBridge] pushAuthSessionToWatch failed:', e);
      return false;
    }
  }

  /**
   * Subscribes to step count updates sent from smartwatch wrist sensor.
   */
  onStepSyncReceived(callback: (stepData: WatchStepSync) => void): EmitterSubscription {
    return DeviceEventEmitter.addListener('Watch_StepSyncReceived', (data: string | WatchStepSync) => {
      try {
        const parsed: WatchStepSync = typeof data === 'string' ? JSON.parse(data) : data;
        callback(parsed);
      } catch (err) {
        console.error('[WatchBridge] Failed to parse step sync event:', err);
      }
    });
  }

  /**
   * Pushes daily step count to watch so the watch display stays in sync with the phone.
   */
  async syncStepsToWatch(steps: number, sessionDate?: string): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      if (WatchBridgeModule && typeof WatchBridgeModule.pushStepSync === 'function') {
        const date = sessionDate || new Date().toISOString().split('T')[0];
        return await WatchBridgeModule.pushStepSync(steps, date);
      }
      return false;
    } catch (e) {
      console.warn('[WatchBridge] syncStepsToWatch failed:', e);
      return false;
    }
  }

  /**
   * Pushes daily water total to watch so the watch display stays in sync with the phone.
   */
  async syncWaterToWatch(waterIntakeMl: number, waterGoalMl: number): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      if (WatchBridgeModule && typeof WatchBridgeModule.pushWaterSync === 'function') {
        return await WatchBridgeModule.pushWaterSync(waterIntakeMl, waterGoalMl);
      }
      return false;
    } catch (e) {
      console.warn('[WatchBridge] syncWaterToWatch failed:', e);
      return false;
    }
  }
}

export const watchBridge = new WatchBridgeService();
