import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

const parseTimeToMinutes = (timeStr: string): number => {
  try {
    const parts = timeStr.trim().split(/\s+/);
    const time = parts[0];
    const modifier = parts[1] ? parts[1].toUpperCase() : '';

    let [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    let minutes = parseInt(minutesStr, 10);

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  } catch (e) {
    console.error('[attendanceHelper] Error parsing time string:', timeStr, e);
    return 0;
  }
};

export async function markAttendance(qrString: string, customerId: string) {
  try {
    let gymId: string | null = null;

    if (qrString.startsWith('gkfitness_checkin:')) {
      const parts = qrString.split(':');
      if (parts.length !== 3) {
        return { success: false, message: 'Invalid dynamic QR Code format.' };
      }

      gymId = parts[1];
      const timestamp = parseInt(parts[2], 10);

      if (isNaN(timestamp)) {
        return { success: false, message: 'Corrupted QR Code.' };
      }

      const now = Date.now();
      const diff = Math.abs(now - timestamp);

      if (diff > 30000) {
        return { success: false, message: 'This QR Code has expired. Please scan the current code on the screen.' };
      }
    } else {
      // It's a static QR (likely a UUID)
      // Check if it matches a gymId directly
      let { data: gymData } = await supabase
        .from('gyms')
        .select('gymId')
        .eq('gymId', qrString)
        .eq('is_deleted', false)
        .maybeSingle();

      // If not found, check if it's the qrCodeId embedded in the qrPath filename
      if (!gymData) {
        const { data: pathData } = await supabase
          .from('gyms')
          .select('gymId')
          .ilike('qrPath', `%${qrString}%`)
          .eq('is_deleted', false)
          .maybeSingle();
        gymData = pathData;
      }

      if (!gymData) {
        return { success: false, message: 'Invalid or unrecognized QR Code format.' };
      }
      
      gymId = gymData.gymId;
    }

    if (!gymId) {
      return { success: false, message: 'Could not determine gym from QR Code.' };
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('gym_customer_membership_plans')
      .select('is_Active, endDate')
      .eq('gymId', gymId)
      .eq('customerId', customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (membershipError || !membershipData) {
      return { success: false, message: 'You do not have a membership at this gym.' };
    }

    const currentDate = new Date();

    // Lazy evaluation: If plan is still marked active, but end date has passed, deactivate it
    if (membershipData.is_Active && membershipData.endDate) {
      const endDate = new Date(membershipData.endDate);

      // If current time is strictly past the endDate
      if (currentDate > endDate) {
        membershipData.is_Active = false;

        // Background task to correct the database asynchronously (fire-and-forget)
        supabase
          .from('gym_customer_membership_plans')
          .update({ is_Active: false })
          .eq('gymId', gymId)
          .eq('customerId', customerId)
          .then();
      }
    }

    let hasAccess = membershipData.is_Active;

    if (!hasAccess && membershipData.endDate) {
      const endDate = new Date(membershipData.endDate);
      const gracePeriodEnd = new Date(endDate.getTime() + 5 * 24 * 60 * 60 * 1000);

      if (currentDate <= gracePeriodEnd) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return { success: false, message: 'Your membership at this gym has expired beyond the 5-day grace period.' };
    }

    // 1. Duplicate check (minGapMinutes)
    const { data: checkInRule, error: ruleErr } = await supabase
      .from('gym_check_in_rules')
      .select('minGapMinutes')
      .eq('gymId', gymId)
      .is('deletedAt', null)
      .maybeSingle();

    if (ruleErr) {
      console.error('[attendanceHelper] Error fetching check-in rules:', ruleErr);
    }

    const { data: lastAttendance, error: lastAttendanceErr } = await supabase
      .from('gym_attendance')
      .select('markedAt')
      .eq('gymId', gymId)
      .eq('customerId', customerId)
      .order('markedAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAttendanceErr) {
      console.error('[attendanceHelper] Error fetching last attendance:', lastAttendanceErr);
    }

    const gapMinutes = checkInRule?.minGapMinutes || 0;
    const gapMs = gapMinutes * 60 * 1000;
    const nowMs = Date.now();

    if (lastAttendance && lastAttendance.markedAt && gapMinutes > 0) {
      const lastMarkedMs = new Date(lastAttendance.markedAt).getTime();
      const diffMs = nowMs - lastMarkedMs;
      if (diffMs < gapMs) {
        const remainingMinutes = Math.ceil((gapMs - diffMs) / (60 * 1000));
        return { 
          success: false, 
          message: `Duplicate scan detected. Please wait ${remainingMinutes} more minute(s).` 
        };
      }
    }

    // 2. Gym Timings Check
    const localNow = new Date();
    const currentHours = localNow.getHours();
    const currentMinutes = localNow.getMinutes();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = daysOfWeek[localNow.getDay()];

    const { data: gymTiming, error: timingErr } = await supabase
      .from('gym_timings')
      .select('*')
      .eq('gymId', gymId)
      .eq('day', currentDayName)
      .is('deletedAt', null)
      .maybeSingle();

    if (timingErr) {
      console.error('[attendanceHelper] Error fetching gym timings:', timingErr);
    }

    if (gymTiming) {
      if (gymTiming.isClosed) {
        return { success: false, message: `Gym is closed today (${currentDayName}).` };
      }

      const scanTimeMinutes = currentHours * 60 + currentMinutes;
      const openMinutes = parseTimeToMinutes(gymTiming.openTime);
      const closeMinutes = parseTimeToMinutes(gymTiming.closeTime);

      if (gymTiming.openTime && gymTiming.closeTime) {
        if (scanTimeMinutes < openMinutes || scanTimeMinutes > closeMinutes) {
          return { 
            success: false, 
            message: `Outside gym open hours (${gymTiming.openTime} - ${gymTiming.closeTime}).` 
          };
        }
      }
    }

    // 3. Mark Attendance
    const markedAt = localNow.toISOString();
    const tzOffset = localNow.getTimezoneOffset() * 60000;
    const localDate = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('gym_attendance')
      .insert({
        attendanceId: Crypto.randomUUID(),
        gymId,
        customerId,
        markedAt,
        date: localDate
      })
      .select();

    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'Attendance already marked at this time.' };
      }
      throw error;
    }

    return { success: true, message: 'Attendance marked successfully!', data: data?.[0] };

  } catch (err: any) {
    console.error('[attendanceHelper] markAttendance Error:', err);
    return {
      success: false,
      message: 'Something went wrong while marking attendance. Please try again or ask the gym staff.'
    };
  }
}

export async function fetchCustomerAttendance(customerId: string) {
  const { data, error } = await supabase
    .from('gym_attendance')
    .select('*')
    .eq('customerId', customerId)
    .order('markedAt', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchGymAttendanceToday(gymId: string, date?: string) {
  const localDate = date || (new Date(Date.now() - (new Date()).getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('gym_attendance')
    .select('attendanceId, customerId, markedAt')
    .eq('gymId', gymId)
    .eq('date', localDate)
    .order('markedAt', { ascending: false });

  if (error) {
    console.error('[attendanceHelper] fetchGymAttendanceToday error:', error);
    throw error;
  }
  return data || [];
}

