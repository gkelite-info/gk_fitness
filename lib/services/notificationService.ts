import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { fetchBlockedUsers } from '@/helpers/community/blockCache';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // 1. ALWAYS request permissions (crucial for iOS local notifications to work anywhere)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true }
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Failed to get permissions for notifications!');
    return null;
  }

  // 2. Gating for Remote Push Tokens (APNs/FCM)
  if (isExpoGo && Platform.OS === 'ios') {
    console.log('Remote push tokens are disabled in Expo Go for iOS. Local notifications will still work.');
    return null;
  }
  
  if (!Device.isDevice) {
    console.log('Must use physical device for Remote Push Notifications. Local notifications will still work.');
    return null;
  }

  try {
    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (!projectId) {
      console.warn('EXPO_PUBLIC_EAS_PROJECT_ID is not defined, push token registration might fail if using EAS.');
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    const expoPushToken = tokenData.data;

    // Save token to Supabase
    const { error } = await supabase.from('user_push_tokens').upsert(
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

    if (error) {
      console.error('Error saving push token to Supabase:', error);
    }

    return expoPushToken;
  } catch (error) {
    console.error('Error fetching Expo Push Token:', error);
    return null;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: any,
  data?: Record<string, any>
) {
  if (!Notifications) return;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, data },
    trigger,
  });
}

export async function cancelAllScheduledNotifications() {
  if (!Notifications) return;
  return Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancels only the scheduled notifications that are categorized as water reminders.
 */
export async function cancelWaterReminders() {
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'water_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedules daily water reminders with custom start, end, and intervals.
 * Industry standard pattern to ensure users hydrate consistently throughout the day.
 */
export async function scheduleWaterReminders(startHour = 8, endHour = 20, interval = 2) {
  if (!Notifications) return;
  // First, clear any existing water reminders to avoid duplicates
  await cancelWaterReminders();

  const reminderHours = [];
  for (let h = startHour; h <= endHour; h += interval) {
    reminderHours.push(h);
  }
  
  const messages = [
    { title: '💧 Morning Hydration', body: 'Start your day right! Drink a glass of water.' },
    { title: '💧 Hydration Check', body: 'Time for a quick water break.' },
    { title: '💧 Mid-day Refresh', body: 'Keep your energy up. Drink some water!' },
    { title: '💧 Afternoon Hydration', body: 'Stay focused and hydrated. Grab a glass!' },
    { title: '💧 Water Break', body: 'Almost through the day. Keep drinking water.' },
    { title: '💧 Evening Hydration', body: 'Unwind and rehydrate.' },
    { title: '💧 Final Hydration', body: 'One last small glass before winding down for the night.' },
  ];

  for (let i = 0; i < reminderHours.length; i++) {
    const hour = reminderHours[i];
    // Cycle through messages if there are more reminders than messages
    const message = messages[i % messages.length];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        data: { type: 'water_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  }
  console.log(`Successfully scheduled daily water reminders from ${startHour}:00 to ${endHour}:00 every ${interval} hours.`);
}

/**
 * Cancels only the scheduled notifications that are categorized as workout reminders.
 */
export async function cancelWorkoutReminders() {
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'workout_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedules dynamic workout reminders as per industry standards.
 * Reminds users at 5 PM on weekdays and 10 AM on weekends.
 */
export async function scheduleWorkoutReminders() {
  if (!Notifications) return;
  await cancelWorkoutReminders(); // Clear existing to prevent duplicates

  const messages = [
    { title: '💪 Time to Crush It!', body: 'Your workout awaits. Let\'s hit the gym and make today count!' },
    { title: '🏋️‍♀️ Ready to Lift?', body: 'Consistency is key. Time for your scheduled workout!' },
    { title: '🏃‍♂️ Get Moving!', body: 'Don\'t skip today. A 30-minute session is all you need.' },
    { title: '🔥 Burn Those Calories', body: 'Step into the gym and unleash your potential today.' }
  ];

  // Schedule daily, we can use a rotating schedule for days 1-7
  for (let day = 1; day <= 7; day++) {
    const isWeekend = day === 1 || day === 7; // Sunday=1, Saturday=7 in JS
    const hour = isWeekend ? 10 : 17; // 10 AM weekends, 5 PM weekdays
    const message = messages[day % messages.length];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        data: { type: 'workout_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day,
        hour,
        minute: 0,
      },
    });
  }
  
  console.log(`Successfully scheduled industry-standard weekly workout reminders.`);
}

/**
 * Cancels only the scheduled notifications that are categorized as meal reminders.
 */
export async function cancelMealReminders() {
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.type === 'meal_reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/**
 * Schedules daily meal reminders for Breakfast, Lunch, and Dinner as per industry standard nutrition tracking apps.
 * Default times: Breakfast 8:30 AM, Lunch 1:15 PM, Dinner 8:00 PM.
 */
export async function scheduleMealReminders(options?: {
  breakfastTime?: { hour: number; minute: number };
  lunchTime?: { hour: number; minute: number };
  dinnerTime?: { hour: number; minute: number };
}) {
  if (!Notifications) return;
  await cancelMealReminders(); // Clear existing to prevent duplicates

  const breakfast = options?.breakfastTime ?? { hour: 8, minute: 30 };
  const lunch = options?.lunchTime ?? { hour: 13, minute: 15 };
  const dinner = options?.dinnerTime ?? { hour: 20, minute: 0 };

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
      content: {
        title: item.title,
        body: item.body,
        sound: true,
        data: { type: 'meal_reminder', meal: item.meal },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: item.hour,
        minute: item.minute,
      },
    });
  }

  console.log(`Successfully scheduled daily meal reminders for Breakfast, Lunch, and Dinner.`);
}

/**
 * Cancels only the scheduled local notifications that are categorized as pt session reminders.
 */
export async function cancelPTSessionReminders() {
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === 'pt_session_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (err) {
    console.warn('[cancelPTSessionReminders] Warning:', err);
  }
}

/**
 * Schedules local notifications for upcoming PT sessions.
 */
export async function schedulePTSessionReminders(sessions: any[]) {
  if (!Notifications) return;
  await cancelPTSessionReminders();

  const now = new Date();
  let scheduledCount = 0;

  for (const session of sessions) {
    if (!session.sessionDate) continue;
    const sessionDate = new Date(session.sessionDate);
    if (isNaN(sessionDate.getTime())) continue;

    // Schedule 24 hours before
    const twentyFourHoursBefore = new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000);
    if (twentyFourHoursBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🗓️ Upcoming PT Session Tomorrow',
          body: `You have a personal training session scheduled tomorrow at ${sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          sound: true,
          data: { type: 'pt_session_reminder', route: '/(customer)/home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: twentyFourHoursBefore,
        } as any,
      });
      scheduledCount++;
    }

    // Schedule 1 hour before
    const oneHourBefore = new Date(sessionDate.getTime() - 1 * 60 * 60 * 1000);
    if (oneHourBefore > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏳ PT Session in 1 Hour',
          body: `Get ready! Your personal training session starts in 1 hour.`,
          sound: true,
          data: { type: 'pt_session_reminder', route: '/(customer)/home' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneHourBefore,
        } as any,
      });
      scheduledCount++;
    }
  }
  
  console.log(`[schedulePTSessionReminders] Scheduled ${scheduledCount} local reminders for PT sessions.`);
}

/**
 * Syncs the member's local PT session reminders with their database preference.
 */
export async function syncPTSessionReminders(userId: string) {
  if (!Notifications || !userId) return;

  try {
    // 1. Check user preferences
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('ptSessionReminders, pt_session_reminders')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.ptSessionReminders ?? pref?.pt_session_reminders ?? true;
    if (!isEnabled) {
      await cancelPTSessionReminders();
      return;
    }

    // 2. Fetch the user's upcoming PT sessions via customer_trainers inner join
    const { data: sessions, error } = await supabase
      .from('trainer_sessions')
      .select('sessionDate, customer_trainers!inner(customerId)')
      .eq('customer_trainers.customerId', userId)
      .eq('status', 'scheduled')
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

/**
 * Sends a milestone achievement push notification and inbox record if the user has progress_milestones enabled.
 */
export async function sendMilestonePushNotification(userId: string, milestoneType: string, title: string, body: string) {
  try {
    // Check preferences
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('progressMilestones, progress_milestones')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.progressMilestones ?? pref?.progress_milestones ?? true;
    if (!isEnabled) return;

    // Send push
    const { data: tokens } = await supabase
      .from('user_push_tokens')
      .select('expoPushToken')
      .eq('userId', userId);

    const validTokens = (tokens || []).map(t => t.expoPushToken).filter(Boolean);
    
    // Save to inbox
    await supabase.from('user_notifications').insert({
      userNotificationId: Crypto.randomUUID(),
      userId,
      title,
      message: body,
      type: 'milestone',
      metadata: { milestoneType },
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    if (validTokens.length > 0) {
      const expoMessages = validTokens.map(token => ({
        to: token,
        sound: 'default',
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
    
    console.log(`[sendMilestonePushNotification] Sent ${milestoneType} milestone to user ${userId}`);
  } catch (err) {
    console.error('[sendMilestonePushNotification] Error:', err);
  }
}

/**
 * Sends a promotional push notification to all gym members who have opted-in (promotions = true).
 */
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
    // 1. Fetch customer user IDs belonging to this gym
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

    // 2. Fetch preferences for these users (ONLY promotions = true)
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

    // 3. Insert notification records for in-app inbox
    const notificationRecords = optedInUserIds.map((uid) => ({
      userNotificationId: Crypto.randomUUID(),
      userId: uid,
      title: title || 'Special Promotion',
      message: message,
      type: 'promotion',
      metadata: { gymId },
      isRead: false,
      createdAt: new Date().toISOString(),
    }));

    // Batch insert 
    const chunkSize = 100;
    for (let i = 0; i < notificationRecords.length; i += chunkSize) {
      const chunk = notificationRecords.slice(i, i + chunkSize);
      const { error: insertErr } = await supabase.from('user_notifications').insert(chunk);
      if (insertErr) {
        console.error('[sendPromotionPushNotification] Insert inbox error:', insertErr);
      }
    }

    // 4. Send remote push notifications via Expo API
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
        title: title || 'Special Promotion',
        body: message,
        data: { route: '/(customer)/notifications' },
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

    console.log(`[sendPromotionPushNotification] Sent to ${optedInUserIds.length} users, ${pushesSent} push tokens.`);
    return { recipientCount: optedInUserIds.length, pushesSent };
  } catch (err) {
    console.error('[sendPromotionPushNotification] Global error:', err);
    return { recipientCount: 0, pushesSent: 0 };
  }
}

/**
 * Sends push notifications and inbox entries to all gym customers when an announcement is posted.
 * Honors user preferences (gym_announcements) and batches push notifications via Expo API.
 */
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
    // 1. Fetch customer user IDs belonging to this gym
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
      console.log('[sendGymAnnouncementPushNotification] No customers found for gymId:', gymId);
      return { recipientCount: 0, pushesSent: 0 };
    }

    // 2. Filter out users who turned off gym_announcements in preferences
    const { data: prefs, error: prefErr } = await supabase
      .from('user_notification_preferences')
      .select('userId, gymAnnouncements')
      .in('userId', userIds);

    if (prefErr) {
      console.warn('[sendGymAnnouncementPushNotification] Preferences check warning:', prefErr);
    }

    const optedOutSet = new Set(
      prefs?.filter(p => p.gymAnnouncements === false).map(p => p.userId) || []
    );

    const eligibleUserIds = userIds.filter(id => !optedOutSet.has(id));
    if (eligibleUserIds.length === 0) {
      return { recipientCount: 0, pushesSent: 0 };
    }

    const announcementTitle = title || '📢 Gym Announcement';

    // 3. Insert notification records into user_notifications for their in-app inbox
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

    // 4. Query Expo Push Tokens for eligible users
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

      // Batch requests into groups of 100 as per Expo Push API recommendations
      for (let i = 0; i < uniqueTokens.length; i += 100) {
        const batch = uniqueTokens.slice(i, i + 100);
        const pushMessages = batch.map(token => ({
          to: token,
          sound: 'default',
          title: announcementTitle,
          body: message,
          data: { route: '/(customer)/notifications' },
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

    console.log(`[sendGymAnnouncementPushNotification] Sent announcement to ${eligibleUserIds.length} users (${pushesSent} push notifications).`);
    return { recipientCount: eligibleUserIds.length, pushesSent };
  } catch (error) {
    console.error('[sendGymAnnouncementPushNotification] Unexpected error:', error);
    return { recipientCount: 0, pushesSent: 0 };
  }
}

/**
 * Dispatches community activity notifications (Like, Comment, Reply, Follow).
 * Honors user preferences (communityActivity), blocklists, suppresses self-notifications,
 * generates in-app notification inbox records, and dispatches native push notifications via Expo API.
 */
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
    // 1. Guard: Never notify self
    if (!targetUserId || !actorUserId || targetUserId === actorUserId) {
      return false;
    }

    // 2. Guard: Check if target user has blocked actor or vice-versa
    try {
      const blockedUserIds = await fetchBlockedUsers(targetUserId);
      if (blockedUserIds.includes(actorUserId)) {
        return false;
      }
    } catch (e) {
      console.warn('[sendCommunityPushNotification] Block check error:', e);
    }

    // 3. Guard: Check notification preferences of target user
    const { data: pref, error: prefErr } = await supabase
      .from('user_notification_preferences')
      .select('communityActivity')
      .eq('userId', targetUserId)
      .maybeSingle();

    if (pref && pref.communityActivity === false) {
      // User explicitly turned off community notifications
      return false;
    }

    // 4. Fetch actor identity details (name, username, profilePhoto)
    const [userRes, profileRes] = await Promise.all([
      supabase.from('users').select('name, profilePhoto').eq('userId', actorUserId).maybeSingle(),
      supabase.from('gym_community_profiles').select('username').eq('userId', actorUserId).maybeSingle(),
    ]);

    const actorName = userRes.data?.name || 'A community member';
    const actorUsername = profileRes.data?.username;
    const actorHandle = actorUsername ? `@${actorUsername}` : actorName;
    const actorPhoto = userRes.data?.profilePhoto || null;

    // 5. Construct Title, Body, and Route according to industry standards (Instagram)
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

    // 6. Insert into in-app notifications inbox (user_notifications)
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

    // A. Try calling the SECURITY DEFINER RPC first (bypasses RLS safely on the server)
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

      if (!rpcErr && rpcRes?.success) {
        inboxSaved = true;
      }
    } catch (e) {
      // Function may not be installed yet, proceed to direct insert fallback
    }

    // B. Fallback to direct client insert if RPC did not run
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

    // 7. Dispatch push notification via Expo Push API to device tokens
    // We use a SECURITY DEFINER RPC to bypass RLS so User A can send a push to User B.
    const { data: tokenRecords, error: tokenErr } = await supabase
      .rpc('get_user_push_tokens', { p_user_id: targetUserId });

    if (!tokenErr && tokenRecords && tokenRecords.length > 0) {
      const validTokens = tokenRecords
        .map((t: any) => t.expoPushToken || t.expopushtoken) // Handle case-insensitivity from RPC
        .filter((t: any) => typeof t === 'string' && (t.startsWith('ExponentPushToken') || t.startsWith('ExpoPushToken')));

      const uniqueTokens = Array.from(new Set(validTokens));

      if (uniqueTokens.length > 0) {
        const pushMessages = uniqueTokens.map(token => ({
          to: token,
          sound: 'default',
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

/**
 * Cancels only the scheduled local notifications that are categorized as membership renewal reminders.
 */
export async function cancelMembershipRenewalReminders() {
  if (!Notifications) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === 'membership_renewal') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (err) {
    console.warn('[cancelMembershipRenewalReminders] Warning:', err);
  }
}

/**
 * Schedules local countdown notifications leading up to a member's expiration date.
 * Industry standard multi-touch cadence: 7 days, 3 days, 1 day before, and Day of Expiry.
 */
export async function scheduleMembershipRenewalReminders(endDateInput: string | Date, planName = 'gym') {
  if (!Notifications) return;
  await cancelMembershipRenewalReminders();

  const endDate = new Date(endDateInput);
  if (isNaN(endDate.getTime())) return;

  const now = new Date();

  const createTargetDate = (daysBefore: number, hour = 10, minute = 0) => {
    const d = new Date(endDate);
    d.setDate(d.getDate() - daysBefore);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const milestones = [
    {
      daysLeft: 7,
      targetDate: createTargetDate(7, 10, 0),
      title: '⏳ Membership Renewal (7 Days Left)',
      body: `Your ${planName} membership expires in 7 days. Renew early at the gym desk to maintain continuous floor & biometric access!`,
    },
    {
      daysLeft: 3,
      targetDate: createTargetDate(3, 10, 0),
      title: '⚠️ 3 Days Remaining on Membership',
      body: `Only 3 days left on your ${planName} plan! Keep your workout streak and biometric entry active by renewing today.`,
    },
    {
      daysLeft: 1,
      targetDate: createTargetDate(1, 10, 0),
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
        content: {
          title: item.title,
          body: item.body,
          sound: true,
          data: {
            type: 'membership_renewal',
            route: '/(customer)/memberships',
            daysLeft: item.daysLeft,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.targetDate,
        } as any,
      });
      scheduledCount++;
    }
  }

  console.log(`[scheduleMembershipRenewalReminders] Scheduled ${scheduledCount} local renewal reminders for ${planName} membership.`);
}

/**
 * Syncs the member's local renewal reminders with their database preference and active membership plan.
 */
export async function syncMembershipRenewalReminders(userId: string) {
  if (!Notifications || !userId) return;

  try {
    // 1. Check user preferences
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('membershipRenewal, membership_renewal')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.membershipRenewal ?? pref?.membership_renewal ?? true;
    if (!isEnabled) {
      await cancelMembershipRenewalReminders();
      return;
    }

    // 2. Fetch the user's latest active membership plan
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
      // Already expired
      await cancelMembershipRenewalReminders();
      return;
    }

    const planName = latestPlan.gym_membership_plans?.planName || 'gym';
    await scheduleMembershipRenewalReminders(endDate, planName);
  } catch (err) {
    console.error('[syncMembershipRenewalReminders] Error:', err);
  }
}

/**
 * Sends an in-app inbox notification and Expo push notification for an expiring membership milestone.
 * Honors user preferences and includes anti-spam idempotency guards.
 */
export async function sendMembershipRenewalPushNotification(params: {
  userId: string;
  planName?: string;
  daysLeft: number;
  gymId?: string;
}) {
  const { userId, planName = 'gym', daysLeft, gymId } = params;

  try {
    // 1. Verify user preferences
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('membershipRenewal, membership_renewal')
      .eq('userId', userId)
      .maybeSingle();

    const isEnabled = pref?.membershipRenewal ?? pref?.membership_renewal ?? true;
    if (!isEnabled) return false;

    // 2. Determine title and body according to milestone
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

    // 3. Prevent duplicate inbox entries within 20 hours for this milestone
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
      return false; // Skip duplicate
    }

    // 4. Insert into user_notifications
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

    // 5. Send Remote Push Notification via Expo Push Tokens
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

/**
 * Scans active customer memberships across a gym (or all gyms) and dispatches renewal notifications
 * for members whose plan expires in 7 days, 3 days, 1 day, or today.
 */
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

      // Milestones: 7 days, 3 days, 1 day, or 0 days (today)
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
