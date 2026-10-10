import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { 
  scheduleWaterReminders, 
  cancelWaterReminders,
  scheduleWorkoutReminders,
  cancelWorkoutReminders,
  scheduleMealReminders,
  cancelMealReminders,
  scheduleMembershipRenewalReminders,
  syncMembershipRenewalReminders,
  cancelMembershipRenewalReminders,
  syncPTSessionReminders,
  cancelPTSessionReminders
} from '@/lib/services/notificationService';

export interface NotificationPreferences {
  workout_reminders: boolean;
  workout_mode: 'default' | 'custom';
  workout_weekday_hour: number;
  workout_weekday_minute: number;
  workout_weekend_hour: number;
  workout_weekend_minute: number;
  water_reminders: boolean;
  water_mode: 'default' | 'custom';
  water_start_hour: number;
  water_end_hour: number;
  water_interval_hours: number;
  meal_reminders: boolean;
  membership_renewal: boolean;
  pt_session_reminders: boolean;
  gym_announcements: boolean;
  progress_milestones: boolean;
  community_activity: boolean;
  promotions: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  workout_reminders: true,
  workout_mode: 'default',
  workout_weekday_hour: 17,
  workout_weekday_minute: 0,
  workout_weekend_hour: 10,
  workout_weekend_minute: 30,
  water_reminders: true,
  water_mode: 'default',
  water_start_hour: 8,
  water_end_hour: 20,
  water_interval_hours: 2,
  meal_reminders: true,
  membership_renewal: true,
  pt_session_reminders: true,
  gym_announcements: true,
  progress_milestones: true,
  community_activity: true,
  promotions: false,
};

function dbToPreferences(row: any): Partial<NotificationPreferences> {
  if (!row) return {};
  const prefs: Partial<NotificationPreferences> = {};
  if (row.workoutReminders !== undefined || row.workout_reminders !== undefined) {
    prefs.workout_reminders = row.workoutReminders ?? row.workout_reminders;
  }
  if (row.workoutMode !== undefined || row.workout_mode !== undefined) {
    prefs.workout_mode = row.workoutMode ?? row.workout_mode;
  }
  if (typeof row.workoutWeekdayHour === 'number' || typeof row.workout_weekday_hour === 'number') {
    prefs.workout_weekday_hour = row.workoutWeekdayHour ?? row.workout_weekday_hour;
  }
  if (typeof row.workoutWeekdayMinute === 'number' || typeof row.workout_weekday_minute === 'number') {
    prefs.workout_weekday_minute = row.workoutWeekdayMinute ?? row.workout_weekday_minute;
  }
  if (typeof row.workoutWeekendHour === 'number' || typeof row.workout_weekend_hour === 'number') {
    prefs.workout_weekend_hour = row.workoutWeekendHour ?? row.workout_weekend_hour;
  }
  if (typeof row.workoutWeekendMinute === 'number' || typeof row.workout_weekend_minute === 'number') {
    prefs.workout_weekend_minute = row.workoutWeekendMinute ?? row.workout_weekend_minute;
  }
  if (row.waterReminders !== undefined || row.water_reminders !== undefined) {
    prefs.water_reminders = row.waterReminders ?? row.water_reminders;
  }
  if (row.waterMode !== undefined || row.water_mode !== undefined) {
    prefs.water_mode = row.waterMode ?? row.water_mode;
  }
  if (typeof row.waterStartHour === 'number' || typeof row.water_start_hour === 'number') {
    prefs.water_start_hour = row.waterStartHour ?? row.water_start_hour;
  }
  if (typeof row.waterEndHour === 'number' || typeof row.water_end_hour === 'number') {
    prefs.water_end_hour = row.waterEndHour ?? row.water_end_hour;
  }
  if (typeof row.waterIntervalHours === 'number' || typeof row.water_interval_hours === 'number') {
    prefs.water_interval_hours = row.waterIntervalHours ?? row.water_interval_hours;
  }
  if (row.mealReminders !== undefined || row.meal_reminders !== undefined) {
    prefs.meal_reminders = row.mealReminders ?? row.meal_reminders;
  }
  if (row.membershipRenewal !== undefined || row.membership_renewal !== undefined) {
    prefs.membership_renewal = row.membershipRenewal ?? row.membership_renewal;
  }
  if (row.ptSessionReminders !== undefined || row.pt_session_reminders !== undefined) {
    prefs.pt_session_reminders = row.ptSessionReminders ?? row.pt_session_reminders;
  }
  if (row.gymAnnouncements !== undefined || row.gym_announcements !== undefined) {
    prefs.gym_announcements = row.gymAnnouncements ?? row.gym_announcements;
  }
  if (row.progressMilestones !== undefined || row.progress_milestones !== undefined) {
    prefs.progress_milestones = row.progressMilestones ?? row.progress_milestones;
  }
  if (row.communityActivity !== undefined || row.community_activity !== undefined) {
    prefs.community_activity = row.communityActivity ?? row.community_activity;
  }
  if (row.promotions !== undefined) {
    prefs.promotions = row.promotions;
  }
  return prefs;
}

function preferencesToDb(updates: Partial<NotificationPreferences>): Record<string, any> {
  const dbUpdates: Record<string, any> = {};
  if (updates.workout_reminders !== undefined) dbUpdates.workoutReminders = updates.workout_reminders;
  if (updates.workout_mode !== undefined) dbUpdates.workoutMode = updates.workout_mode;
  if (updates.workout_weekday_hour !== undefined) dbUpdates.workoutWeekdayHour = updates.workout_weekday_hour;
  if (updates.workout_weekday_minute !== undefined) dbUpdates.workoutWeekdayMinute = updates.workout_weekday_minute;
  if (updates.workout_weekend_hour !== undefined) dbUpdates.workoutWeekendHour = updates.workout_weekend_hour;
  if (updates.workout_weekend_minute !== undefined) dbUpdates.workoutWeekendMinute = updates.workout_weekend_minute;
  if (updates.water_reminders !== undefined) dbUpdates.waterReminders = updates.water_reminders;
  if (updates.water_mode !== undefined) dbUpdates.waterMode = updates.water_mode;
  if (updates.water_start_hour !== undefined) dbUpdates.waterStartHour = updates.water_start_hour;
  if (updates.water_end_hour !== undefined) dbUpdates.waterEndHour = updates.water_end_hour;
  if (updates.water_interval_hours !== undefined) dbUpdates.waterIntervalHours = updates.water_interval_hours;
  if (updates.meal_reminders !== undefined) dbUpdates.mealReminders = updates.meal_reminders;
  if (updates.membership_renewal !== undefined) dbUpdates.membershipRenewal = updates.membership_renewal;
  if (updates.pt_session_reminders !== undefined) dbUpdates.ptSessionReminders = updates.pt_session_reminders;
  if (updates.gym_announcements !== undefined) dbUpdates.gymAnnouncements = updates.gym_announcements;
  if (updates.progress_milestones !== undefined) dbUpdates.progressMilestones = updates.progress_milestones;
  if (updates.community_activity !== undefined) dbUpdates.communityActivity = updates.community_activity;
  if (updates.promotions !== undefined) dbUpdates.promotions = updates.promotions;
  return dbUpdates;
}

function getCoreDbUpdates(updates: Partial<NotificationPreferences>): Record<string, any> {
  const dbUpdates: Record<string, any> = {};
  if (updates.workout_reminders !== undefined) dbUpdates.workoutReminders = updates.workout_reminders;
  if (updates.water_reminders !== undefined) dbUpdates.waterReminders = updates.water_reminders;
  if (updates.meal_reminders !== undefined) dbUpdates.mealReminders = updates.meal_reminders;
  if (updates.membership_renewal !== undefined) dbUpdates.membershipRenewal = updates.membership_renewal;
  if (updates.pt_session_reminders !== undefined) dbUpdates.ptSessionReminders = updates.pt_session_reminders;
  if (updates.gym_announcements !== undefined) dbUpdates.gymAnnouncements = updates.gym_announcements;
  if (updates.progress_milestones !== undefined) dbUpdates.progressMilestones = updates.progress_milestones;
  if (updates.community_activity !== undefined) dbUpdates.communityActivity = updates.community_activity;
  if (updates.promotions !== undefined) dbUpdates.promotions = updates.promotions;
  return dbUpdates;
}

export function useNotificationPreferences(userId: string | undefined) {
  const qc = useQueryClient();
  const storageKey = `@gk_notification_preferences_${userId}`;

  const query = useQuery({
    queryKey: ['notification_preferences', userId],
    queryFn: async () => {
      // 1. Read locally stored custom schedule preferences
      let localPrefs: Partial<NotificationPreferences> = {};
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          localPrefs = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('[useNotificationPreferences] Local storage read error:', e);
      }

      // 2. Fetch from DB
      let dbPrefs: Partial<NotificationPreferences> = {};
      try {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('userId', userId)
          .maybeSingle();
        
        if (!error && data) {
          dbPrefs = dbToPreferences(data);
        }
      } catch (err) {
        console.warn('[useNotificationPreferences] Fetch DB preferences warning:', err);
      }
      
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...dbPrefs,
        ...localPrefs,
      } as NotificationPreferences;
    },
    enabled: !!userId,
    placeholderData: DEFAULT_NOTIFICATION_PREFERENCES,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh in cache
  });

  const updatePreference = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!userId) return;

      // 1. Save locally to AsyncStorage immediately
      try {
        const existingStored = await AsyncStorage.getItem(storageKey);
        const parsed = existingStored ? JSON.parse(existingStored) : {};
        const merged = { ...parsed, ...updates };
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
      } catch (localErr) {
        console.warn('[useNotificationPreferences] AsyncStorage save warning:', localErr);
      }

      const dbUpdates = preferencesToDb(updates);
      const now = new Date().toISOString();

      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('user_notification_preferences')
          .select('userNotificationPreferenceId, userId')
          .eq('userId', userId)
          .maybeSingle();

        if (fetchErr) {
          console.warn('[useNotificationPreferences] Fetch existing pref warning:', fetchErr);
        }

        if (existing) {
          const { error: updateErr } = await supabase
            .from('user_notification_preferences')
            .update({ ...dbUpdates, updatedAt: now })
            .eq('userId', userId);
            
          if (updateErr) {
            // If error is due to non-existent custom columns (e.g. workoutMode), retry with core columns only
            const coreUpdates = getCoreDbUpdates(updates);
            if (Object.keys(coreUpdates).length > 0) {
              await supabase
                .from('user_notification_preferences')
                .update({ ...coreUpdates, updatedAt: now })
                .eq('userId', userId);
            }
          }
        } else {
          const defaultDb = preferencesToDb(DEFAULT_NOTIFICATION_PREFERENCES);
          const { error: insertErr } = await supabase
            .from('user_notification_preferences')
            .insert({
              userNotificationPreferenceId: Crypto.randomUUID(),
              userId,
              ...defaultDb,
              ...dbUpdates,
              createdAt: now,
              updatedAt: now,
            });
            
          if (insertErr) {
            // Fallback insert with core columns
            const coreDefault = getCoreDbUpdates(DEFAULT_NOTIFICATION_PREFERENCES);
            const coreUpdates = getCoreDbUpdates(updates);
            await supabase
              .from('user_notification_preferences')
              .insert({
                userNotificationPreferenceId: Crypto.randomUUID(),
                userId,
                ...coreDefault,
                ...coreUpdates,
                createdAt: now,
                updatedAt: now,
              });
          }
        }
      } catch (dbErr) {
        console.warn('[useNotificationPreferences] Supabase sync caught error (local preference retained):', dbErr);
      }
    },
    onMutate: async (newPref) => {
      await qc.cancelQueries({ queryKey: ['notification_preferences', userId] });
      const previousPrefs = qc.getQueryData(['notification_preferences', userId]);
      
      qc.setQueryData(['notification_preferences', userId], (old: any) => ({
        ...old,
        ...newPref,
      }));
      
      return { previousPrefs };
    },
    onError: (err, newPref, context) => {
      qc.setQueryData(['notification_preferences', userId], context?.previousPrefs);
    },
    onSuccess: (data, newPref) => {
      // Automatically sync local device alarms when the water reminders preference is toggled or times changed
      if (
        newPref.water_reminders === true || 
        newPref.water_mode !== undefined ||
        newPref.water_start_hour !== undefined || 
        newPref.water_end_hour !== undefined || 
        newPref.water_interval_hours !== undefined
      ) {
        // Read full state from cache to ensure we have the latest custom times
        const currentPrefs = qc.getQueryData(['notification_preferences', userId]) as NotificationPreferences;
        if (currentPrefs?.water_reminders) {
          if (currentPrefs.water_mode === 'custom') {
            scheduleWaterReminders(
              currentPrefs.water_start_hour ?? 8,
              currentPrefs.water_end_hour ?? 20,
              currentPrefs.water_interval_hours ?? 2
            ).catch(console.error);
          } else {
            // Default mode
            scheduleWaterReminders(8, 20, 2).catch(console.error);
          }
        }
      } else if (newPref.water_reminders === false) {
        cancelWaterReminders().catch(console.error);
      }

      if (
        newPref.workout_reminders === true ||
        newPref.workout_mode !== undefined ||
        newPref.workout_weekday_hour !== undefined ||
        newPref.workout_weekday_minute !== undefined ||
        newPref.workout_weekend_hour !== undefined ||
        newPref.workout_weekend_minute !== undefined
      ) {
        const currentPrefs = qc.getQueryData(['notification_preferences', userId]) as NotificationPreferences;
        if (currentPrefs?.workout_reminders) {
          if (currentPrefs.workout_mode === 'custom') {
            scheduleWorkoutReminders({
              weekdayHour: currentPrefs.workout_weekday_hour ?? 17,
              weekdayMinute: currentPrefs.workout_weekday_minute ?? 0,
              weekendHour: currentPrefs.workout_weekend_hour ?? 10,
              weekendMinute: currentPrefs.workout_weekend_minute ?? 30,
            }).catch(console.error);
          } else {
            // Default mode
            scheduleWorkoutReminders({
              weekdayHour: 17,
              weekdayMinute: 0,
              weekendHour: 10,
              weekendMinute: 30,
            }).catch(console.error);
          }
        }
      } else if (newPref.workout_reminders === false) {
        cancelWorkoutReminders().catch(console.error);
      }

      if (newPref.meal_reminders === true) {
        scheduleMealReminders().catch(console.error);
      } else if (newPref.meal_reminders === false) {
        cancelMealReminders().catch(console.error);
      }

      if (newPref.membership_renewal === true) {
        if (userId) {
          syncMembershipRenewalReminders(userId).catch(console.error);
        }
      } else if (newPref.membership_renewal === false) {
        cancelMembershipRenewalReminders().catch(console.error);
      }

      if (newPref.pt_session_reminders === true) {
        if (userId) {
          syncPTSessionReminders(userId).catch(console.error);
        }
      } else if (newPref.pt_session_reminders === false) {
        cancelPTSessionReminders().catch(console.error);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notification_preferences', userId] });
    },
  });

  return { ...query, updatePreference };
}
