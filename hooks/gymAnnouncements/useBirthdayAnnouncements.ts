import { useState, useEffect } from 'react';
import { getBirthdayAnnouncements } from '@/helpers/gymAnnouncements/birthdayAnnouncementsHelper';
import { GymAnnouncementAttributes } from '@/helpers/gymAnnouncements/gymAnnouncementsHelper';

export function useBirthdayAnnouncements(gymId?: string | null) {
  const [birthdayAnnouncements, setBirthdayAnnouncements] = useState<GymAnnouncementAttributes[]>([]);
  const [isLoadingBirthday, setIsLoadingBirthday] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchBirthdays() {
      if (!gymId) {
        if (isMounted) {
          setBirthdayAnnouncements([]);
          setIsLoadingBirthday(false);
        }
        return;
      }

      setIsLoadingBirthday(true);
      try {
        const announcements = await getBirthdayAnnouncements(gymId);
        if (isMounted) {
          setBirthdayAnnouncements(announcements);
        }
      } catch (error) {
        console.error('[useBirthdayAnnouncements] Error fetching birthdays:', error);
      } finally {
        if (isMounted) {
          setIsLoadingBirthday(false);
        }
      }
    }

    fetchBirthdays();

    return () => {
      isMounted = false;
    };
  }, [gymId]);

  return {
    birthdayAnnouncements,
    isLoadingBirthday,
  };
}
