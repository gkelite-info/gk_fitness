import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GymAnnouncementAttributes } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';

export function useRealtimeAnnouncements(gymId: string | null | undefined) {
  const [announcements, setAnnouncements] = useState<GymAnnouncementAttributes[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    if (!gymId) {
      setAnnouncements([]);
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('gym_announcements')
        .select('*')
        .eq('gymId', gymId)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('[useRealtimeAnnouncements] Fetch Error:', error);
      } else if (isMounted) {
        setAnnouncements(data || []);
      }
      if (isMounted) setLoading(false);
    };

    fetchInitialData();

    // Subscribe to Supabase Broadcast (avoids needing postgres replication enabled)
    const channel = supabase
      .channel(`gym_broadcast_${gymId}`)
      .on(
        'broadcast',
        { event: 'new_announcement' },
        (payload) => {
          if (!isMounted) return;
          
          const newRecord = payload.payload as GymAnnouncementAttributes;
          if (!newRecord.is_deleted) {
            setAnnouncements((prev) => {
              // Avoid duplicates if owner has both windows open
              if (prev.some(a => a.gymAnnouncementId === newRecord.gymAnnouncementId)) {
                return prev;
              }
              return [newRecord, ...prev].sort((a, b) => 
                new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
              );
            });
            setHasNew(true);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Successfully connected to Supabase Broadcast!');
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [gymId]);

  const clearHasNew = () => setHasNew(false);

  return { announcements, loading, hasNew, clearHasNew };
}

