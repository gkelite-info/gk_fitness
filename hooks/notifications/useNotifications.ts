import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { registerForPushNotifications } from '@/lib/services/notificationService';
import { useRouter } from 'expo-router';

const isExpoGo =
  (typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false) ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {}
}

export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('userId', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (userId && !isExpoGo) {
      registerForPushNotifications(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      try {
        const route = response?.notification?.request?.content?.data?.route as string;
        if (route) {
          router.push(route as any);
        }
      } catch (e) {
        console.warn('[useNotifications] Notification navigation warning:', e);
      }
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    
    // Create a unique channel name to prevent collisions when the hook is used in multiple components
    const channelId = `notifications:${userId}-${Math.random()}`;
    
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_notifications', 
          filter: `userId=eq.${userId}` 
        },
        () => qc.invalidateQueries({ queryKey: ['notifications', userId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('userId', userId)
        .eq('is_read', false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('userId', userId)
        .eq('is_read', true);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const unreadCount = query.data?.filter(n => !n.is_read).length ?? 0;

  return { ...query, markRead, markAllRead, deleteRead, unreadCount };
}
