import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
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

function dbToPreferences(row: any): NotificationPreferences {
  if (!row) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    workout_reminders: row.workoutReminders ?? row.workout_reminders ?? true,
    water_reminders: row.waterReminders ?? row.water_reminders ?? true,
    water_mode: row.waterMode ?? row.water_mode ?? 'default',
    water_start_hour: typeof row.waterStartHour === 'number' ? row.waterStartHour : (row.water_start_hour ?? 8),
    water_end_hour: typeof row.waterEndHour === 'number' ? row.waterEndHour : (row.water_end_hour ?? 20),
    water_interval_hours: typeof row.waterIntervalHours === 'number' ? row.waterIntervalHours : (row.water_interval_hours ?? 2),
    meal_reminders: row.mealReminders ?? row.meal_reminders ?? true,
    membership_renewal: row.membershipRenewal ?? row.membership_renewal ?? true,
    pt_session_reminders: row.ptSessionReminders ?? row.pt_session_reminders ?? true,
    gym_announcements: row.gymAnnouncements ?? row.gym_announcements ?? true,
    progress_milestones: row.progressMilestones ?? row.progress_milestones ?? true,
    community_activity: row.communityActivity ?? row.community_activity ?? true,
    promotions: row.promotions ?? false,
  };
}

function preferencesToDb(updates: Partial<NotificationPreferences>): Record<string, any> {
  const dbUpdates: Record<string, any> = {};
  if (updates.workout_reminders !== undefined) dbUpdates.workoutReminders = updates.workout_reminders;
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

export function useNotificationPreferences(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notification_preferences', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
      
      if (error) {
        console.error("Fetch preferences error:", error);
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
      
      return dbToPreferences(data);
    },
    enabled: !!userId,
    placeholderData: DEFAULT_NOTIFICATION_PREFERENCES,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh in cache
  });

  const updatePreference = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      if (!userId) return;
      const dbUpdates = preferencesToDb(updates);
      const now = new Date().toISOString();

      const { data: existing, error: fetchErr } = await supabase
        .from('user_notification_preferences')
        .select('userNotificationPreferenceId, userId')
        .eq('userId', userId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Fetch existing pref error:", fetchErr);
        throw fetchErr;
      }

      if (existing) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({ ...dbUpdates, updatedAt: now })
          .eq('userId', userId);
          
        if (error) {
          console.error("Update pref error:", error);
          throw error;
        }
      } else {
        const defaultDb = preferencesToDb(DEFAULT_NOTIFICATION_PREFERENCES);
        const { error } = await supabase
          .from('user_notification_preferences')
          .insert({
            userNotificationPreferenceId: Crypto.randomUUID(),
            userId,
            ...defaultDb,
            ...dbUpdates,
            createdAt: now,
            updatedAt: now,
          });
          
        if (error) {
          console.error("Insert pref error:", error);
          throw error;
        }
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

      if (newPref.workout_reminders === true) {
        scheduleWorkoutReminders().catch(console.error);
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
