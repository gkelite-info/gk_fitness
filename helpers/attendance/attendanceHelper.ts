import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

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

    const localNow = new Date();
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
        return { success: false, message: 'Attendance already marked for today.' };
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

export async function fetchGymAttendanceToday(gymId: string) {
  const localNow = new Date();
  const tzOffset = localNow.getTimezoneOffset() * 60000;
  const localDate = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('gym_attendance')
    .select(`
      attendanceId,
      markedAt,
      gymCustomers (
        customerId,
        users ( name, email )
      )
    `)
    .eq('gymId', gymId)
    .eq('date', localDate)
    .order('markedAt', { ascending: false });

  if (error) throw error;
  return data || [];
}

