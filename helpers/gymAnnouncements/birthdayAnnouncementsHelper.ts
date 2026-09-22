import { supabase } from '@/lib/supabase';
import { GymAnnouncementAttributes } from './gymAnnouncementsHelper';

export function isBirthdayToday(dateStr?: string | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.trim();
  if (!clean) return false;

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(clean)) {
    const parts = clean.split('T')[0].split(/[-\/]/);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (m === todayMonth && d === todayDay) return true;
  }

  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/.test(clean)) {
    const parts = clean.split(/[-\/]/);
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    if ((p1 === todayMonth && p2 === todayDay) || (p2 === todayMonth && p1 === todayDay)) {
      return true;
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const mLocal = parsed.getMonth() + 1;
    const dLocal = parsed.getDate();
    const mUTC = parsed.getUTCMonth() + 1;
    const dUTC = parsed.getUTCDate();
    if ((mLocal === todayMonth && dLocal === todayDay) || (mUTC === todayMonth && dUTC === todayDay)) {
      return true;
    }
  }

  return false;
}

export async function getBirthdayAnnouncements(gymId?: string | null): Promise<GymAnnouncementAttributes[]> {
  if (!gymId) return [];

  try {
    const [ownersRes, trainersRes, customersRes] = await Promise.all([
      supabase.from('gym_owners').select('userId').eq('gymId', gymId).eq('is_deleted', false),
      supabase.from('trainers').select('userId').eq('gymId', gymId).eq('is_deleted', false),
      supabase.from('gym_customers').select('customerId').eq('gymId', gymId).eq('is_deleted', false),
    ]);

    const ownerUserIds = (ownersRes.data || []).map((o: any) => o.userId).filter(Boolean);
    const trainerUserIds = (trainersRes.data || []).map((t: any) => t.userId).filter(Boolean);
    const customerUserIds = (customersRes.data || []).map((c: any) => c.customerId).filter(Boolean);

    const allUserIds = Array.from(new Set([...ownerUserIds, ...trainerUserIds, ...customerUserIds]));

    if (allUserIds.length === 0) return [];

    const { data: users, error: usersErr } = await supabase
      .from('users')
      .select('userId, name, role, dob')
      .in('userId', allUserIds);

    if (usersErr) {
      console.error('[birthdayAnnouncementsHelper] getBirthdayAnnouncements fetch users error:', usersErr);
      throw usersErr;
    }

    const birthdaysToday = (users || []).filter((u: any) => {
      // Allow active or null status, filter out suspended if needed
      return isBirthdayToday(u.dob);
    });

    const now = new Date().toISOString();

    const announcements: GymAnnouncementAttributes[] = birthdaysToday.map((user: any) => {
      let role = 'Member';
      if (ownerUserIds.includes(user.userId)) role = 'Owner';
      else if (trainerUserIds.includes(user.userId)) role = 'Trainer';
      else if (customerUserIds.includes(user.userId)) role = 'Customer';

      return {
        gymAnnouncementId: `birthday-${user.userId}-${now.split('T')[0]}`,
        gymId: gymId,
        message: `💐 Happy Birthday to ${user.name || 'User'}`,
        createdBy: 'system',
        createdAt: now,
        updatedAt: now,
        announcementType: 'BIRTHDAY'
      };
    });

    return announcements;
  } catch (error) {
    console.error('[birthdayAnnouncementsHelper] Error:', error);
    return [];
  }
}
