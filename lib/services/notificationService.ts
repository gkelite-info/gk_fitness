import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Crypto from 'expo-crypto';
import { fetchBlockedUsers } from '@/helpers/community/blockCache';

const isExpoGo =
  (typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false) ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
let cachedExpoPushToken: string | null = null;

// Remote push notifications were removed from Expo Go on Android with SDK 53+.
// Importing expo-notifications in Expo Go on Android triggers a fatal error during module evaluation.
// Therefore, we only load expo-notifications when NOT running in Expo Go.
function withTimeout<T = any>(promise: Promise<any>, ms: number, stepName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out (${ms / 1000}s) during ${stepName}. Check notification settings in Android App Info.`)),
        ms
      )
    ),
  ]);
}

let channelsSetupPromise: Promise<void> | null = null;
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications?.setNotificationChannelAsync) {
    return;
  }
  if (channelsSetupPromise) {
    return channelsSetupPromise;
  }
  channelsSetupPromise = (async () => {
    try {
      await withTimeout(
        Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#CCF200',
          enableVibrate: true,
          showBadge: true,
        }),
        5000,
        'creating default notification channel'
      );

      await withTimeout(
        Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders & Workouts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#CCF200',
          enableVibrate: true,
          showBadge: true,
        }),
        5000,
        'creating reminders notification channel'
      );
    } catch (e: any) {
      console.warn('[notificationService] Failed to create notification channels:', e?.message || e);
      channelsSetupPromise = null;
    }
  })();
  return channelsSetupPromise;
}

export async function clearAppBadge(): Promise<void> {
  if (isExpoGo || !Notifications?.setBadgeCountAsync) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (err) {
    console.warn('[notificationService] Failed to clear badge count:', err);
  }
}

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications?.setNotificationHandler) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (handlerErr: any) {
        console.warn('[notificationService] setNotificationHandler failed (native module missing in this build):', handlerErr?.message || handlerErr);
      }
    }
    // Initialize channels early on Android
    setupNotificationChannels().catch(() => {});
  } catch (error) {
    console.warn('[notificationService] Failed to load expo-notifications:', error);
  }
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    return null;
  }

  try {
    // 0. Ensure Android notification channels exist
    await setupNotificationChannels();

    // 1. ALWAYS request permissions (crucial for local/push notifications to work anywhere)
    const existingStatus = await withTimeout(
      Notifications.getPermissionsAsync(),
      5000,
      'checking notification permission'
    );
    let finalStatus = existingStatus?.status;
    if (finalStatus !== 'granted') {
      const requested = await withTimeout(
        Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true }
        }),
        8000,
        'requesting notification permission'
      );
      finalStatus = requested?.status;

      if (finalStatus !== 'granted') {
        console.warn(`[notificationService] Push notification permission not granted (Status: ${finalStatus}).`);
        return null;
      }
    }

    if (!Device.isDevice) {
      console.log('[notificationService] Must use physical device for Remote Push Notifications. Local notifications will still work.');
      return null;
    }

    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      '99fd4ec8-3138-4950-8a93-2f09dd96dbfc';

    if (!projectId) {
      console.warn('[notificationService] EAS Project ID is not defined, push token registration will fail.');
      return null;
    }

    const tokenData = await withTimeout(
      Notifications.getExpoPushTokenAsync({
        projectId,
      }),
      10000,
      'fetching Expo Push Token from server'
    );

    const expoPushToken = tokenData?.data;
    if (!expoPushToken) {
      console.warn('[notificationService] getExpoPushTokenAsync returned empty token.');
      return null;
    }

    console.log('[notificationService] Registered Expo Push Token successfully:', expoPushToken);
    cachedExpoPushToken = expoPushToken;

    // Purge any stale tokens for this physical device associated with other users.
    // If User B previously logged in on this phone and now User A logs in,
    // this ensures User B is disassociated from this device token, preventing
    // cross-user push notification leaks on shared / test devices.
    try {
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('expoPushToken', expoPushToken)
        .neq('userId', userId);
    } catch (cleanErr: any) {
      console.warn('[notificationService] Failed to clean stale device push tokens:', cleanErr?.message || cleanErr);
    }

    // Save token to Supabase with resilient conflict fallback
    const { error: upsertErr } = await supabase.from('user_push_tokens').upsert(
      {
        userpushTokenId: Crypto.randomUUID(),
        userId: userId,
        expoPushToken: expoPushToken,
        platform: Platform.OS,
        deviceName: Device.deviceName || 'Unknown Device',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'userId,expoPushToken' }
    );

    if (upsertErr) {
      console.warn('[notificationService] Upsert onConflict error, attempting query-and-save fallback:', upsertErr.message);
      const { data: existing } = await supabase
        .from('user_push_tokens')
        .select('userpushTokenId')
        .eq('userId', userId)
        .eq('expoPushToken', expoPushToken)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_push_tokens')
          .update({
            deviceName: Device.deviceName || 'Unknown Device',
            platform: Platform.OS,
            updatedAt: new Date().toISOString()
          })
          .eq('userpushTokenId', existing.userpushTokenId);
      } else {
        await supabase
          .from('user_push_tokens')
          .insert({
            userpushTokenId: Crypto.randomUUID(),
            userId: userId,
            expoPushToken: expoPushToken,
            platform: Platform.OS,
            deviceName: Device.deviceName || 'Unknown Device',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
      }
    }

    return expoPushToken;
  } catch (error: any) {
    console.error('[notificationService] Error fetching Expo Push Token:', error?.message || error);
    return null;
  }
}

/**
 * Unregisters the current device's push token from Supabase for the specified user (or this device).
 * Called on user logout to prevent subsequent notifications from reaching this device.
 */
export async function unregisterPushToken(userId?: string): Promise<void> {
  if (isExpoGo || !Notifications) return;

  try {
    let token = cachedExpoPushToken;
    if (!token) {
      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        '99fd4ec8-3138-4950-8a93-2f09dd96dbfc';
      if (projectId) {
        const tokenData = await withTimeout(
          Notifications.getExpoPushTokenAsync({ projectId }),
          4000,
          'fetching token for unregister'
        );
        token = tokenData?.data || null;
      }
    }

    if (token) {
      let query = supabase.from('user_push_tokens').delete().eq('expoPushToken', token);
      if (userId) {
        query = query.eq('userId', userId);
      }
      const { error } = await query;
      if (error) {
        console.warn('[notificationService] Error unregistering push token on logout:', error.message);
      } else {
        console.log('[notificationService] Successfully unregistered push token on logout:', token);
      }
    }
    cachedExpoPushToken = null;
  } catch (err: any) {
    console.warn('[notificationService] Failed to unregister push token:', err?.message || err);
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: any,
  data?: Record<string, any>
) {
  if (!Notifications) return;
  await setupNotificationChannels();
  return withTimeout(
    Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        channelId: 'default',
        data,
      },
      trigger,
    }),
    6000,
    'scheduleLocalNotification'
  );
}

/**
 * Triggers an immediate local test notification with sound and vibration.
 * Works on both Android and iOS development builds.
 */
export async function sendTestLocalNotification(title?: string, body?: string) {
  if (isExpoGo || !Notifications) {
    throw new Error('Notifications are disabled in Expo Go. Run on a development build.');
  }

  // 1. Setup channels with timeout
  await setupNotificationChannels();

  // 2. Check current permission status
  const existingStatus = await withTimeout(
    Notifications.getPermissionsAsync(),
    5000,
    'checking notification permission'
  );

  let finalStatus = existingStatus?.status;
  if (finalStatus !== 'granted') {
    const requested = await withTimeout(
      Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }),
      8000,
      'requesting notification permission'
    );
    finalStatus = requested?.status;

    if (finalStatus !== 'granted') {
      const canAskAgain = requested?.canAskAgain ?? existingStatus?.canAskAgain;
      if (canAskAgain === false || finalStatus === 'denied') {
        throw new Error('PERMISSION_BLOCKED: Notifications are disabled in your system settings. Please enable them in App Info -> Notifications.');
      }
      throw new Error(`Notification permission not granted (Status: ${finalStatus}).`);
    }
  }

  // 3. Schedule notification with channel-aware trigger for Android
  const trigger = Platform.OS === 'android' ? ({ channelId: 'default' } as any) : null;
  return await withTimeout(
    Notifications.scheduleNotificationAsync({
      content: {
        title: title || '⚡ GK Fitness Notification Test',
        body: body || 'Your notification system is working properly on this device!',
        sound: true,
        data: { type: 'test', timestamp: Date.now() },
      },
      trigger,
    }),
    8000,
    'scheduling local notification'
  );
}

export async function cancelAllScheduledNotifications() {
  if (!Notifications) return;
  return Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelWaterReminders() {
  if (!Notifications) return;
  try {
    for (let h = 0; h < 24; h++) {
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_hour_${h}`).catch(() => { });
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_${h}_0`).catch(() => { });
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_${h}_15`).catch(() => { });
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_${h}_30`).catch(() => { });
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_${h}_45`).catch(() => { });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.content.data?.type === 'water_reminder' ||
        notification.identifier?.startsWith('water_reminder_')
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
      }
    }
  } catch (err) {
    console.warn('[cancelWaterReminders] Warning:', err);
  }
}

function getWaterReminderMessage(hour: number, minute: number, isFirst: boolean, isLast: boolean): { title: string; body: string } {
  // First reminder of the active hydration window
  if (isFirst) {
    return {
      title: '💧 Hydration Window Started',
      body: 'Time for your first glass of water to kick off your hydration window!',
    };
  }

  // Last reminder of the active hydration window
  if (isLast) {
    return {
      title: '💧 Hydration Window Ending',
      body: 'Final water reminder of your active window! Stay refreshed and hit your goal.',
    };
  }

  // Late night / night shift window: 10 PM - 4:59 AM (22:00 - 04:59)
  if (hour >= 22 || hour < 5) {
    const nightPool = [
      { title: '💧 Night Hydration', body: 'Staying active? Drink a glass of water to stay refreshed.' },
      { title: '💧 Hydration Check', body: 'Keep sipping water to keep your body balanced through the night.' },
      { title: '💧 Water Break', body: 'A quick sip of water to keep your energy and focus steady.' },
    ];
    const index = (hour * 2 + (minute >= 30 ? 1 : 0)) % nightPool.length;
    return nightPool[index];
  }

  // Morning window: 5 AM - 11:59 AM (05:00 - 11:59)
  if (hour < 12) {
    const morningPool = [
      { title: '💧 Morning Hydration', body: 'Stay fresh and energized. Time for a glass of water!' },
      { title: '💧 Hydration Check', body: 'Keep your morning momentum going with a quick water break.' },
      { title: '💧 Drink Water', body: 'A quick sip to keep you focused and hydrated this morning.' },
      { title: '💧 Water Break', body: 'Hydration powers your morning. Grab a glass of water!' },
    ];
    const index = (hour * 2 + (minute >= 30 ? 1 : 0)) % morningPool.length;
    return morningPool[index];
  }

  // Mid-day / Lunch window: 12 PM - 1:59 PM (12:00 - 13:59)
  if (hour < 14) {
    const middayPool = [
      { title: '💧 Mid-day Refresh', body: 'Keep your energy high. Grab a glass of water with your lunch!' },
      { title: '💧 Hydration Check', body: 'Halfway through the day! Remember to drink some water.' },
      { title: '💧 Water Break', body: 'Replenish and recharge. Time for a mid-day water break.' },
    ];
    const index = (hour * 2 + (minute >= 30 ? 1 : 0)) % middayPool.length;
    return middayPool[index];
  }

  // Afternoon window: 2 PM - 4:59 PM (14:00 - 16:59)
  if (hour < 17) {
    const afternoonPool = [
      { title: '💧 Afternoon Hydration', body: 'Beat the afternoon slump! Stay focused and grab a glass of water.' },
      { title: '💧 Water Break', body: 'Time for a refreshing water break to power through the afternoon.' },
      { title: '💧 Stay Hydrated', body: 'Keep your hydration on track as you work through the day.' },
      { title: '💧 Hydration Check', body: 'A quick glass of water to keep your body feeling great.' },
    ];
    const index = (hour * 2 + (minute >= 30 ? 1 : 0)) % afternoonPool.length;
    return afternoonPool[index];
  }

  // Evening window: 5 PM - 9:59 PM (17:00 - 21:59)
  const eveningPool = [
    { title: '💧 Evening Hydration', body: 'Unwind and rehydrate after your daily activities.' },
    { title: '💧 Hydration Check', body: 'Almost hit your daily goal? Keep drinking water this evening!' },
    { title: '💧 Water Break', body: 'Support your workout recovery with a refreshing glass of water.' },
    { title: '💧 Stay Hydrated', body: 'Finish strong today. Drink a glass of water!' },
  ];
  const index = (hour * 2 + (minute >= 30 ? 1 : 0)) % eveningPool.length;
  return eveningPool[index];
}

export async function scheduleWaterReminders(startHour = 8, endHour = 20, interval = 2) {
  if (!Notifications) return;
  await cancelWaterReminders();

  // Robustly sanitize inputs (hours in 0..23, interval between 0.5 and 12)
  let sHour = Math.floor(Math.max(0, Math.min(23, Number(startHour) || 0)));
  let eHour = Math.floor(Math.max(0, Math.min(23, Number(endHour) || 0)));
  const stepMinutes = Math.max(15, Math.round(Math.max(0.5, Math.min(12, Number(interval) || 2)) * 60));

  // Edge case: A window cannot have 0 duration (start === end); auto-adjust eHour to standard 12-hour window
  if (sHour === eHour) {
    eHour = (sHour + 12) % 24;
  }

  let totalMinutesSpan = eHour > sHour
    ? (eHour - sHour) * 60
    : (24 - sHour + eHour) * 60;

  // Cap active window span at 23 hours max (never 24h or full day wrap)
  totalMinutesSpan = Math.min(totalMinutesSpan, 23 * 60);

  const reminderSlots: { hour: number; minute: number }[] = [];

  for (let offset = 0; offset <= totalMinutesSpan; offset += stepMinutes) {
    const totalMinuteOfDay = (sHour * 60 + offset) % (24 * 60);
    const hour = Math.floor(totalMinuteOfDay / 60);
    const minute = totalMinuteOfDay % 60;
    if (!reminderSlots.some((s) => s.hour === hour && s.minute === minute)) {
      reminderSlots.push({ hour, minute });
    }
  }

  if (reminderSlots.length === 0) return;

  for (let i = 0; i < reminderSlots.length; i++) {
    const { hour, minute } = reminderSlots[i];
    const isFirst = i === 0;
    const isLast = i === reminderSlots.length - 1;
    const message = getWaterReminderMessage(hour, minute, isFirst, isLast);

    await Notifications.scheduleNotificationAsync({
      identifier: `water_reminder_${hour}_${minute}`,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        channelId: 'reminders',
        data: { type: 'water_reminder', hour, minute },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'reminders',
      },
    });
  }
}

export async function syncWaterReminders(userId: string) {
  if (!Notifications || !userId) return;
  try {
    const storageKey = `@gk_notification_preferences_${userId}`;
    let localPrefs: any = {};
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) localPrefs = JSON.parse(stored);
    } catch { }

    const { data: dbPref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = localPrefs.water_reminders ?? dbPref?.waterReminders ?? dbPref?.water_reminders ?? true;
    if (!isEnabled) {
      await cancelWaterReminders();
      return;
    }

    const mode = localPrefs.water_mode ?? dbPref?.waterMode ?? dbPref?.water_mode ?? 'default';
    if (mode === 'custom') {
      const startHour = localPrefs.water_start_hour ?? dbPref?.waterStartHour ?? dbPref?.water_start_hour ?? 8;
      const endHour = localPrefs.water_end_hour ?? dbPref?.waterEndHour ?? dbPref?.water_end_hour ?? 20;
      const interval = localPrefs.water_interval_hours ?? dbPref?.waterIntervalHours ?? dbPref?.water_interval_hours ?? 2;
      await scheduleWaterReminders(startHour, endHour, interval);
    } else {
      await scheduleWaterReminders(8, 20, 2);
    }
  } catch (err) {
    console.warn('[syncWaterReminders] Warning:', err);
  }
}

export async function cancelWorkoutReminders() {
  if (!Notifications) return;
  try {
    for (let day = 1; day <= 7; day++) {
      await Notifications.cancelScheduledNotificationAsync(`workout_reminder_day_${day}`).catch(() => { });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.content.data?.type === 'workout_reminder' ||
        notification.identifier?.startsWith('workout_reminder_')
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
      }
    }
  } catch (err) {
    console.warn('[cancelWorkoutReminders] Warning:', err);
  }
}

export async function scheduleWorkoutReminders(options?: {
  weekdayHour?: number;
  weekdayMinute?: number;
  weekendHour?: number;
  weekendMinute?: number;
}) {
  if (!Notifications) return;
  await cancelWorkoutReminders();

  const weekdayHour = options?.weekdayHour ?? 17;
  const weekdayMinute = options?.weekdayMinute ?? 0;
  const weekendHour = options?.weekendHour ?? 10;
  const weekendMinute = options?.weekendMinute ?? 30;

  const messages = [
    { title: '💪 Time to Crush It!', body: 'Your workout awaits. Let\'s hit the gym and make today count!' },
    { title: '🏋️‍♀️ Ready to Lift?', body: 'Consistency is key. Time for your scheduled workout!' },
    { title: '🏃‍♂️ Get Moving!', body: 'Don\'t skip today. A 30-minute session is all you need.' },
    { title: '🔥 Burn Those Calories', body: 'Step into the gym and unleash your potential today.' }
  ];

  for (let day = 1; day <= 7; day++) {
    const isWeekend = day === 1 || day === 7;
    const hour = isWeekend ? weekendHour : weekdayHour;
    const minute = isWeekend ? weekendMinute : weekdayMinute;
    const message = messages[day % messages.length];

    await Notifications.scheduleNotificationAsync({
      identifier: `workout_reminder_day_${day}`,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        channelId: 'reminders',
        data: { type: 'workout_reminder', day, hour, minute },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day,
        hour,
        minute,
        channelId: 'reminders',
      },
    });
  }
}

export async function syncWorkoutReminders(userId: string) {
  if (!Notifications || !userId) return;
  try {
    const storageKey = `@gk_notification_preferences_${userId}`;
    let localPrefs: any = {};
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) localPrefs = JSON.parse(stored);
    } catch { }

    const { data: dbPref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = localPrefs.workout_reminders ?? dbPref?.workoutReminders ?? dbPref?.workout_reminders ?? true;
    if (!isEnabled) {
      await cancelWorkoutReminders();
      return;
    }

    const mode = localPrefs.workout_mode ?? dbPref?.workoutMode ?? dbPref?.workout_mode ?? 'default';
    if (mode === 'custom') {
      const weekdayHour = localPrefs.workout_weekday_hour ?? dbPref?.workoutWeekdayHour ?? dbPref?.workout_weekday_hour ?? 17;
      const weekdayMinute = localPrefs.workout_weekday_minute ?? dbPref?.workoutWeekdayMinute ?? dbPref?.workout_weekday_minute ?? 0;
      const weekendHour = localPrefs.workout_weekend_hour ?? dbPref?.workoutWeekendHour ?? dbPref?.workout_weekend_hour ?? 10;
      const weekendMinute = localPrefs.workout_weekend_minute ?? dbPref?.workoutWeekendMinute ?? dbPref?.workout_weekend_minute ?? 30;
      await scheduleWorkoutReminders({ weekdayHour, weekdayMinute, weekendHour, weekendMinute });
    } else {
      await scheduleWorkoutReminders({ weekdayHour: 17, weekdayMinute: 0, weekendHour: 10, weekendMinute: 30 });
    }
  } catch (err) {
    console.warn('[syncWorkoutReminders] Warning:', err);
  }
}

export async function cancelMealReminders() {
  if (!Notifications) return;
  try {
    const mealKeys = ['breakfast', 'lunch', 'dinner'];
    for (const meal of mealKeys) {
      await Notifications.cancelScheduledNotificationAsync(`meal_reminder_${meal}`).catch(() => { });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.content.data?.type === 'meal_reminder' ||
        notification.identifier?.startsWith('meal_reminder_')
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
      }
    }
  } catch (err) {
    console.warn('[cancelMealReminders] Warning:', err);
  }
}

export async function scheduleMealReminders(options?: {
  breakfastTime?: { hour: number; minute: number };
  lunchTime?: { hour: number; minute: number };
  dinnerTime?: { hour: number; minute: number };
}) {
  if (!Notifications) return;
  await cancelMealReminders();

  const breakfast = options?.breakfastTime ?? { hour: 8, minute: 30 };
  const lunch = options?.lunchTime ?? { hour: 13, minute: 15 };
  const dinner = options?.dinnerTime ?? { hour: 20, minute: 15 };

  const mealSchedules = [
    {
      meal: 'breakfast',
      hour: breakfast.hour,
      minute: breakfast.minute,
      title: '🍳 Breakfast Fuel',
      body: 'Start your day strong! Track your breakfast to hit your daily nutrition & macro targets.',
    },
    {
      meal: 'lunch',
      hour: lunch.hour,
      minute: lunch.minute,
      title: '🥗 Midday Nutrition',
      body: 'Keep your energy high and stay on track. Don\'t forget to log your lunch!',
    },
    {
      meal: 'dinner',
      hour: dinner.hour,
      minute: dinner.minute,
      title: '🍲 Dinner & Daily Wrap-up',
      body: 'Wrap up your day! Log your dinner to review your daily calorie balance and macros.',
    },
  ];

  for (const item of mealSchedules) {
    await Notifications.scheduleNotificationAsync({
      identifier: `meal_reminder_${item.meal}`,
      content: {
        title: item.title,
        body: item.body,
        sound: true,
        channelId: 'reminders',
        data: { type: 'meal_reminder', meal: item.meal },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: item.minute,
        channelId: 'reminders',
      },
    });
  }
}

export async function syncMealReminders(userId: string) {
  if (!Notifications || !userId) return;
  try {
    const storageKey = `@gk_notification_preferences_${userId}`;
    let localPrefs: any = {};
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) localPrefs = JSON.parse(stored);
    } catch { }

    const { data: dbPref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = localPrefs.meal_reminders ?? dbPref?.mealReminders ?? dbPref?.meal_reminders ?? true;
    if (!isEnabled) {
      await cancelMealReminders();
      return;
    }

    await scheduleMealReminders();
  } catch (err) {
    console.warn('[syncMealReminders] Warning:', err);
  }
}


export async function cancelPTSessionReminders() {
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.content.data?.type === 'pt_session_reminder' ||
        notification.identifier?.startsWith('pt_session_')
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
      }
    }
  } catch (err) {
    console.warn('[cancelPTSessionReminders] Warning:', err);
  }
}

export async function schedulePTSessionReminders(sessions: any[]) {
  if (!Notifications) return;
  await cancelPTSessionReminders();

  const now = new Date();
  let scheduledCount = 0;

  for (const session of sessions) {
    if (!session.sessionDate) continue;
    const sessionDate = new Date(session.sessionDate);
    if (isNaN(sessionDate.getTime())) continue;

    const sessionId = session.trainerSessionId || session.id || sessionDate.getTime();

    const twentyFourHoursBefore = new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000);
    if (twentyFourHoursBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `pt_session_${sessionId}_24h`,
        content: {
          title: '🗓️ Upcoming PT Session Tomorrow',
          body: `You have a personal training session scheduled tomorrow at ${sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          sound: true,
          channelId: 'reminders',
          data: { type: 'pt_session_reminder', route: '/(customer)/home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: twentyFourHoursBefore,
          channelId: 'reminders',
        } as any,
      });
      scheduledCount++;
    }

    const oneHourBefore = new Date(sessionDate.getTime() - 1 * 60 * 60 * 1000);
    if (oneHourBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `pt_session_${sessionId}_1h`,
        content: {
          title: '⏳ PT Session in 1 Hour',
          body: `Get ready! Your personal training session starts in 1 hour.`,
          sound: true,
          channelId: 'reminders',
          data: { type: 'pt_session_reminder', route: '/(customer)/home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneHourBefore,
          channelId: 'reminders',
        } as any,
      });
      scheduledCount++;
    }
  }

}

export async function syncPTSessionReminders(userId: string) {
  if (!Notifications || !userId) return;

  try {
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.ptSessionReminders ?? pref?.pt_session_reminders ?? true;
    if (!isEnabled) {
      await cancelPTSessionReminders();
      return;
    }

    const { data: sessions, error } = await supabase
      .from('trainer_sessions')
      .select('sessionDate, customer_trainers!inner(customerId)')
      .eq('customer_trainers.customerId', userId)
      .eq('status', 'pending')
      .gte('sessionDate', new Date().toISOString())
      .order('sessionDate', { ascending: true })
      .limit(10);

    if (error) {
      console.warn('[syncPTSessionReminders] Error fetching PT sessions:', error);
      return;
    }

    if (!sessions || sessions.length === 0) {
      await cancelPTSessionReminders();
      return;
    }

    await schedulePTSessionReminders(sessions);
  } catch (err) {
    console.error('[syncPTSessionReminders] Error:', err);
  }
}

export async function sendMilestonePushNotification(userId: string, milestoneType: string, title: string, body: string) {
  try {
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.progressMilestones ?? pref?.progress_milestones ?? true;
    if (!isEnabled) return;

    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('expoPushToken')
      .eq('userId', userId);

    const validTokens = (tokens || []).map(t => t.expoPushToken).filter(Boolean);

    await supabase.from('user_notifications').insert({
      id: Crypto.randomUUID(),
      userId,
      title,
      body,
      category: 'MILESTONE',
      data: { type: 'milestone', milestoneType, route: '/(customer)/notifications' },
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (validTokens.length > 0) {
      const expoMessages = validTokens.map(token => ({
        to: token,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
        title,
        body,
        data: { route: '/(customer)/notifications', type: 'milestone' },
      }));

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expoMessages),
      });
    }

  } catch (err) {
    console.error('[sendMilestonePushNotification] Error:', err);
  }
}

export async function sendPromotionPushNotification({
  gymId,
  title,
  message,
}: {
  gymId: string;
  title?: string;
  message: string;
}): Promise<{ recipientCount: number; pushesSent: number }> {
  try {
    const { data: customers, error: custErr } = await supabase
      .from('gym_customers')
      .select('userId')
      .eq('gymId', gymId);

    if (custErr) {
      console.error('[sendPromotionPushNotification] Fetch customers error:', custErr);
      return { recipientCount: 0, pushesSent: 0 };
    }

    const userIds = Array.from(new Set(customers?.map(c => c.userId).filter(Boolean) as string[]));
    if (userIds.length === 0) {
      return { recipientCount: 0, pushesSent: 0 };
    }

    const { data: prefs, error: prefErr } = await supabase
      .from('user_notification_preferences')
      .select('userId, promotions')
      .in('userId', userIds)
      .eq('promotions', true);

    if (prefErr) {
      console.error('[sendPromotionPushNotification] Fetch prefs error:', prefErr);
      return { recipientCount: 0, pushesSent: 0 };
    }

    const optedInUserIds = prefs?.map(p => p.userId).filter(Boolean) as string[];
    if (optedInUserIds.length === 0) {
      return { recipientCount: 0, pushesSent: 0 };
    }

    const notificationRecords = optedInUserIds.map((uid) => ({
      id: Crypto.randomUUID(),
      userId: uid,
      title: title || 'Special Promotion',
      body: message,
      category: 'PROMOTION',
      data: { type: 'promotion', gymId, route: '/(customer)/notifications' },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const chunkSize = 100;
    for (let i = 0; i < notificationRecords.length; i += chunkSize) {
      const chunk = notificationRecords.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase.from('user_notifications').insert(chunk);
      if (insertErr) {
        console.error('[sendPromotionPushNotification] Insert inbox error:', insertErr);
      }
    }

    const { data: tokensData, error: tokensErr } = await supabase
      .from('user_push_tokens')
      .select('userId, expoPushToken')
      .in('userId', optedInUserIds);

    if (tokensErr) {
      console.error('[sendPromotionPushNotification] Fetch tokens error:', tokensErr);
    }

    const validTokens = (tokensData || []).filter((t) => !!t.expoPushToken);
    let pushesSent = 0;

    if (validTokens.length > 0) {
      const expoMessages = validTokens.map((t) => ({
        to: t.expoPushToken,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
        title: title || 'Special Promotion',
        body: message,
        data: { route: '/(customer)/notifications', type: 'promotion' },
      }));

      for (let i = 0; i < expoMessages.length; i += chunkSize) {
        const chunk = expoMessages.slice(i, i + chunkSize);
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });
          if (response.ok) {
            pushesSent += chunk.length;
          } else {
            console.error('[sendPromotionPushNotification] Expo API error status:', response.status);
          }
        } catch (pushErr) {
          console.error('[sendPromotionPushNotification] Expo API fetch error:', pushErr);
        }
      }
    }

    return { recipientCount: optedInUserIds.length, pushesSent };
  } catch (err) {
    console.error('[sendPromotionPushNotification] Global error:', err);
    return { recipientCount: 0, pushesSent: 0 };
  }
}

export async function sendGymAnnouncementPushNotification({
  gymId,
  title,
  message,
}: {
  gymId: string;
  title?: string;
  message: string;
}): Promise<{ recipientCount: number; pushesSent: number }> {
  try {
    const { data: customers, error: custErr } = await supabase
      .from('gym_customers')
      .select('userId')
      .eq('gymId', gymId);

    if (custErr) {
      console.error('[sendGymAnnouncementPushNotification] Fetch customers error:', custErr);
      return { recipientCount: 0, pushesSent: 0 };
    }

    const userIds = Array.from(new Set(customers?.map(c => c.userId).filter(Boolean) as string[]));
    if (userIds.length === 0) {
      return { recipientCount: 0, pushesSent: 0 };
    }

    const { data: prefs, error: prefErr } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .in('userId', userIds);

    if (prefErr) {
      console.warn('[sendGymAnnouncementPushNotification] Preferences check warning:', prefErr);
    }

    const optedOutSet = new Set(
      prefs?.filter(p => p.gymAnnouncements === false || p.gym_announcements === false).map(p => p.userId) || []
    );

    const eligibleUserIds = userIds.filter(id => !optedOutSet.has(id));
    if (eligibleUserIds.length === 0) {
      return { recipientCount: 0, pushesSent: 0 };
    }

    const announcementTitle = title || '📢 Gym Announcement';

    const inboxRecords = eligibleUserIds.map(uid => ({
      id: Crypto.randomUUID(),
      userId: uid,
      title: announcementTitle,
      body: message,
      category: 'GYM_ANNOUNCEMENT',
      data: { type: 'announcement', gymId, route: '/(customer)/notifications' },
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertErr } = await supabase
      .from('user_notifications')
      .insert(inboxRecords);

    if (insertErr) {
      console.error('[sendGymAnnouncementPushNotification] Inbox insert error:', insertErr);
    }

    const { data: tokenRecords, error: tokenErr } = await supabase
      .from('user_push_tokens')
      .select('expoPushToken, userId')
      .in('userId', eligibleUserIds);

    if (tokenErr) {
      console.error('[sendGymAnnouncementPushNotification] Push tokens fetch error:', tokenErr);
    }

    let pushesSent = 0;
    if (tokenRecords && tokenRecords.length > 0) {
      const validTokens = tokenRecords
        .map(t => t.expoPushToken)
        .filter(t => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));

      const uniqueTokens = Array.from(new Set(validTokens));

      for (let i = 0; i < uniqueTokens.length; i += 100) {
        const batch = uniqueTokens.slice(i, i + 100);
        const pushMessages = batch.map(token => ({
          to: token,
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          title: announcementTitle,
          body: message,
          data: { route: '/(customer)/notifications', type: 'announcement' },
        }));

        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushMessages),
          });

          if (response.ok) {
            pushesSent += batch.length;
          } else {
            console.error('[sendGymAnnouncementPushNotification] Expo response error:', await response.text());
          }
        } catch (fetchErr) {
          console.error('[sendGymAnnouncementPushNotification] Expo push network error:', fetchErr);
        }
      }
    }

    return { recipientCount: eligibleUserIds.length, pushesSent };
  } catch (error) {
    console.error('[sendGymAnnouncementPushNotification] Unexpected error:', error);
    return { recipientCount: 0, pushesSent: 0 };
  }
}

export async function sendCommunityPushNotification({
  targetUserId,
  actorUserId,
  type,
  postId,
  postImage,
  commentId,
  commentText,
}: {
  targetUserId: string;
  actorUserId: string;
  type: 'like' | 'comment' | 'reply' | 'follow';
  postId?: string;
  postImage?: string | null;
  commentId?: string;
  commentText?: string;
}): Promise<boolean> {
  try {
    if (!targetUserId || !actorUserId || targetUserId === actorUserId) {
      return false;
    }

    try {
      const blockedUserIds = await fetchBlockedUsers(targetUserId);
      if (blockedUserIds.includes(actorUserId)) {
        return false;
      }
    } catch (e) {
      console.warn('[sendCommunityPushNotification] Block check error:', e);
    }

    const { data: pref, error: prefErr } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', targetUserId)
      .maybeSingle();

    if (pref && (pref.communityActivity === false || pref.community_activity === false)) {
      return false;
    }

    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('name, profilePhoto').eq('userId', actorUserId).maybeSingle(),
      supabase.from('gym_community_profiles').select('username').eq('userId', actorUserId).maybeSingle(),
    ]);

    const actorName = userRes.data?.name || 'A community member';
    const actorUsername = profileRes.data?.username;
    const actorHandle = actorUsername ? `@${actorUsername}` : actorName;
    const actorPhoto = userRes.data?.profilePhoto || null;

    let title = 'GK Community';
    let body = `${actorHandle} interacted with your profile.`;
    let route = '/community';

    const cleanPreview = commentText
      ? (commentText.length > 55 ? commentText.substring(0, 52) + '...' : commentText)
      : '';

    switch (type) {
      case 'like':
        title = '❤️ New Like';
        body = `${actorHandle} liked your post.`;
        route = postId ? `/community/post/${postId}` : '/community';
        break;
      case 'comment':
        title = '💬 New Comment';
        body = cleanPreview ? `${actorHandle} commented: "${cleanPreview}"` : `${actorHandle} commented on your post.`;
        route = postId ? `/community/comments?postId=${postId}` : '/community';
        break;
      case 'reply':
        title = '💬 New Reply';
        body = cleanPreview ? `${actorHandle} replied: "${cleanPreview}"` : `${actorHandle} replied to your comment.`;
        route = postId ? `/community/comments?postId=${postId}` : '/community';
        break;
      case 'follow':
        title = '👤 New Follower';
        body = `${actorHandle} started following you.`;
        route = `/community/profile/${actorUserId}`;
        break;
    }

    const notificationPayload = {
      type,
      actorUserId,
      actorName,
      actorHandle,
      actorPhoto,
      postId: postId || null,
      postImage: postImage || null,
      commentId: commentId || null,
      route,
    };

    let inboxSaved = false;
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('send_community_notification', {
        p_target_user_id: targetUserId,
        p_actor_user_id: actorUserId,
        p_type: type,
        p_title: title,
        p_body: body,
        p_data: notificationPayload,
      });

      if (!rpcErr && rpcRes) {
        inboxSaved = true;
      }
    } catch (e) {
    }

    if (!inboxSaved) {
      const notificationId = Crypto.randomUUID();
      const { error: inboxErr } = await supabase
        .from('user_notifications')
        .insert({
          id: notificationId,
          userId: targetUserId,
          title,
          body,
          category: 'COMMUNITY',
          data: notificationPayload,
          is_read: false,
          created_at: new Date().toISOString(),
        });

      if (inboxErr) {
        if (inboxErr.code === '42501') {
          console.warn('[sendCommunityPushNotification] RLS policy restricts direct cross-user inbox insert. Please execute fix_notifications_rls_and_rpc.sql in Supabase SQL editor.');
        } else {
          console.error('[sendCommunityPushNotification] Inbox insert error:', inboxErr);
        }
      }
    }

    // 1. Collect all actor push tokens (current active device token + any stored in DB for actor)
    // to guarantee the actor's device NEVER receives a push notification for their own action
    const actorPushTokens = new Set<string>();
    if (cachedExpoPushToken) {
      actorPushTokens.add(cachedExpoPushToken);
    }
    try {
      const { data: actorRecords } = await supabase
        .rpc('get_user_push_tokens', { p_user_id: actorUserId });
      if (actorRecords && actorRecords.length > 0) {
        actorRecords.forEach((t: any) => {
          const tok = t.expoPushToken || t.expopushtoken;
          if (tok) actorPushTokens.add(tok);
        });
      }
    } catch (e) {
      console.warn('[sendCommunityPushNotification] Could not fetch actor tokens for exclusion:', e);
    }

    // 2. Fetch target user's push tokens
    let tokenRecords: any[] = [];
    const { data: rpcTokens, error: tokenErr } = await supabase
      .rpc('get_user_push_tokens', { p_user_id: targetUserId });

    if (!tokenErr && rpcTokens) {
      tokenRecords = rpcTokens;
    } else {
      // Fallback query if RPC fails or is missing
      const { data: directTokens } = await supabase
        .from('user_push_tokens')
        .select('expoPushToken')
        .eq('userId', targetUserId);
      if (directTokens) tokenRecords = directTokens;
    }

    if (tokenRecords && tokenRecords.length > 0) {
      const validTokens = tokenRecords
        .map((t: any) => t.expoPushToken || t.expopushtoken)
        .filter((t: any) => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')))
        .filter((t: string) => !actorPushTokens.has(t)); // ABSOLUTE SUPPRESSION: Filter out any sender device token

      const uniqueTokens = Array.from(new Set(validTokens));

      if (uniqueTokens.length > 0) {
        const pushMessages = uniqueTokens.map(token => ({
          to: token,
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          title,
          body,
          data: {
            route,
            type,
            postId,
            actorUserId,
          },
        }));

        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushMessages),
          });
        } catch (fetchErr) {
          console.error('[sendCommunityPushNotification] Expo push network error:', fetchErr);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('[sendCommunityPushNotification] Unexpected error:', error);
    return false;
  }
}

export async function cancelMembershipRenewalReminders() {
  if (!Notifications) return;
  try {
    const milestones = [7, 3, 1, 0];
    for (const days of milestones) {
      await Notifications.cancelScheduledNotificationAsync(`membership_renewal_${days}d`).catch(() => { });
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (
        notification.content.data?.type === 'membership_renewal' ||
        notification.identifier?.startsWith('membership_renewal_')
      ) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier).catch(() => { });
      }
    }
  } catch (err) {
    console.warn('[cancelMembershipRenewalReminders] Warning:', err);
  }
}


export async function scheduleMembershipRenewalReminders(endDateInput: string | Date, planName = 'gym') {
  if (!Notifications) return;
  await cancelMembershipRenewalReminders();

  const endDate = new Date(endDateInput);
  if (isNaN(endDate.getTime())) return;

  const now = new Date();

  const createTargetDate = (daysBefore: number, hour = 9, minute = 30) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - daysBefore);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const milestones = [
    {
      daysLeft: 7,
      targetDate: createTargetDate(7, 9, 30),
      title: '⏳ Membership Renewal (7 Days Left)',
      body: `Your ${planName} membership expires in 7 days. Renew early at the gym desk to maintain continuous floor & biometric access!`,
    },
    {
      daysLeft: 3,
      targetDate: createTargetDate(3, 9, 30),
      title: '⚠️ 3 Days Remaining on Membership',
      body: `Only 3 days left on your ${planName} plan! Keep your workout streak and biometric entry active by renewing today.`,
    },
    {
      daysLeft: 1,
      targetDate: createTargetDate(1, 9, 30),
      title: '🚨 Membership Expires Tomorrow',
      body: `Your gym membership expires tomorrow. Visit reception today to avoid biometric access interruption!`,
    },
    {
      daysLeft: 0,
      targetDate: createTargetDate(0, 9, 0),
      title: '⚠️ Membership Expires Today',
      body: `Today is the final day of your gym membership. Stop by the front desk to renew your plan and continue your fitness journey!`,
    },
  ];

  let scheduledCount = 0;
  for (const item of milestones) {
    if (item.targetDate.getTime() > now.getTime()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `membership_renewal_${item.daysLeft}d`,
        content: {
          title: item.title,
          body: item.body,
          sound: true,
          channelId: 'reminders',
          data: {
            type: 'membership_renewal',
            route: '/(customer)/memberships',
            daysLeft: item.daysLeft,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.targetDate,
          channelId: 'reminders',
        } as any,
      });
      scheduledCount++;
    }
  }

}


export async function syncMembershipRenewalReminders(userId: string) {
  if (!Notifications || !userId) return;

  try {
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.membershipRenewal ?? pref?.membership_renewal ?? true;
    if (!isEnabled) {
      await cancelMembershipRenewalReminders();
      return;
    }

    const { data: customerPlans, error } = await supabase
      .from('gym_customer_membership_plans')
      .select('*, gym_membership_plans(planName)')
      .eq('customerId', userId)
      .eq('is_deleted', false)
      .eq('is_Active', true)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[syncMembershipRenewalReminders] Error fetching active plan:', error);
      return;
    }

    const latestPlan = customerPlans?.[0];
    if (!latestPlan || !latestPlan.endDate) {
      await cancelMembershipRenewalReminders();
      return;
    }

    const endDate = new Date(latestPlan.endDate);
    if (isNaN(endDate.getTime()) || endDate.getTime() <= Date.now()) {
      await cancelMembershipRenewalReminders();
      return;
    }

    const planName = latestPlan.gym_membership_plans?.planName || 'gym';
    await scheduleMembershipRenewalReminders(endDate, planName);
  } catch (err) {
    console.error('[syncMembershipRenewalReminders] Error:', err);
  }
}


export async function sendMembershipRenewalPushNotification(params: {
  userId: string;
  planName?: string;
  daysLeft: number;
  gymId?: string;
}) {
  const { userId, planName = 'gym', daysLeft, gymId } = params;

  try {
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.membershipRenewal ?? pref?.membership_renewal ?? true;
    if (!isEnabled) return false;

    let title = '⏳ Membership Renewal';
    let body = `Your ${planName} membership is expiring soon. Renew at the gym reception desk to stay active!`;

    if (daysLeft === 7) {
      title = '⏳ Membership Renewal (7 Days Left)';
      body = `Your ${planName} membership expires in 7 days. Renew early at the gym desk to maintain continuous floor & biometric access!`;
    } else if (daysLeft === 3) {
      title = '⚠️ 3 Days Remaining on Membership';
      body = `Only 3 days left on your ${planName} plan! Keep your workout streak and biometric entry active by renewing today.`;
    } else if (daysLeft === 1) {
      title = '🚨 Membership Expires Tomorrow';
      body = `Your ${planName} membership expires tomorrow. Visit reception today to avoid biometric access interruption!`;
    } else if (daysLeft === 0) {
      title = '⚠️ Membership Expires Today';
      body = `Today is the final day of your ${planName} membership. Stop by the front desk to renew your plan!`;
    } else if (daysLeft < 0) {
      title = '❌ Membership Expired';
      body = `Your ${planName} membership has expired. Renew your plan at the gym reception desk to reactivate your access.`;
    }

    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const { data: existingNotifs } = await supabase
      .from('user_notifications')
      .select('id, data')
      .eq('userId', userId)
      .eq('category', 'MEMBERSHIP')
      .gte('created_at', twentyHoursAgo);

    const alreadySentForMilestone = existingNotifs?.some(
      (n: any) => n.data?.daysLeft === daysLeft
    );

    if (alreadySentForMilestone) {
      return false;
    }

    const notificationId = Crypto.randomUUID();
    const { error: insertErr } = await supabase
      .from('user_notifications')
      .insert({
        id: notificationId,
        userId: userId,
        title,
        body,
        category: 'MEMBERSHIP',
        data: {
          type: 'membership_renewal',
          route: '/(customer)/memberships',
          daysLeft,
          planName,
          gymId,
        },
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error('[sendMembershipRenewalPushNotification] Error inserting inbox notification:', insertErr);
    }

    const { data: tokenRecords } = await supabase
      .from('user_push_tokens')
      .select('expoPushToken')
      .eq('userId', userId);

    if (tokenRecords && tokenRecords.length > 0) {
      const validTokens = tokenRecords
        .map(t => t.expoPushToken)
        .filter(t => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));

      const uniqueTokens = Array.from(new Set(validTokens));
      if (uniqueTokens.length > 0) {
        const pushMessages = uniqueTokens.map(token => ({
          to: token,
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          title,
          body,
          data: {
            route: '/(customer)/memberships',
            type: 'membership_renewal',
            daysLeft,
          },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pushMessages),
        });
      }
    }

    return true;
  } catch (error) {
    console.error('[sendMembershipRenewalPushNotification] Error:', error);
    return false;
  }
}


export async function checkAndDispatchExpiringMembershipNotifications(gymId?: string) {
  try {
    let query = supabase
      .from('gym_customer_membership_plans')
      .select('*, gym_membership_plans(planName)')
      .eq('is_deleted', false)
      .eq('is_Active', true);

    if (gymId) {
      query = query.eq('gymId', gymId);
    }

    const { data: plans, error } = await query;
    if (error || !plans) return { checked: 0, sent: 0 };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let sentCount = 0;
    for (const plan of plans) {
      if (!plan.endDate || !plan.customerId) continue;

      const end = new Date(plan.endDate);
      end.setHours(0, 0, 0, 0);

      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if ([7, 3, 1, 0].includes(diffDays)) {
        const sent = await sendMembershipRenewalPushNotification({
          userId: plan.customerId,
          planName: plan.gym_membership_plans?.planName || 'gym',
          daysLeft: diffDays,
          gymId: plan.gymId,
        });
        if (sent) sentCount++;
      }
    }

    return { checked: plans.length, sent: sentCount };
  } catch (err) {
    console.error('[checkAndDispatchExpiringMembershipNotifications] Error:', err);
    return { checked: 0, sent: 0 };
  }
}

/**
 * High-level orchestrator that synchronizes all local reminder notification schedules
 * (Water, Workouts, Meals, Membership Renewals, PT Sessions) based on the user's
 * active preferences and schedules across iOS and Android.
 */
export async function syncAllLocalReminders(userId: string): Promise<void> {
  if (!userId || isExpoGo || !Notifications) return;

  try {
    await setupNotificationChannels();
    await Promise.allSettled([
      syncWaterReminders(userId),
      syncWorkoutReminders(userId),
      syncMealReminders(userId),
      syncMembershipRenewalReminders(userId),
      syncPTSessionReminders(userId),
    ]);
  } catch (err) {
    console.warn('[syncAllLocalReminders] Error synchronizing local reminders:', err);
  }
}

