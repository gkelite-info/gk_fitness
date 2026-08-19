import { supabase } from '@/lib/supabase';

export interface BiometricAttendanceLogRow {
  logId: string;
  gymId: string;
  deviceId: string;
  customerId: string;
  scanTimestamp: string;
  logType: string;
  authMethod: string;
  processedStatus: string;
  rejectionReason: string | null;
  createdAt: string;
  customer?: { fullName: string; phone: string; email: string } | null;
  device?: { deviceName: string; deviceSerialNumber: string } | null;
}

export const getBiometricAttendanceLogs = async (
  gymId: string,
  page = 1,
  limit = 10,
  filters?: {
    deviceId?: string;
    logType?: string;
    fromDate?: string;
    toDate?: string;
    searchQuery?: string;
  }
) => {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("gym_biometric_attendance_logs")
      .select(`
        *,
        customer:gym_customers(fullName, phone, email),
        device:gym_biometric_devices(deviceName, deviceSerialNumber)
      `, { count: "exact" })
      .eq("gymId", gymId)
      .is("deletedAt", null);

    if (filters?.deviceId) {
      query = query.eq("deviceId", filters.deviceId);
    }
    if (filters?.logType) {
      query = query.eq("logType", filters.logType);
    }
    if (filters?.fromDate) {
      query = query.gte("scanTimestamp", filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte("scanTimestamp", filters.toDate);
    }

    if (filters?.searchQuery?.trim()) {
      const { data: customersMatch } = await supabase
        .from("gym_customers")
        .select("customerId")
        .eq("gymId", gymId)
        .ilike("fullName", `%${filters.searchQuery.trim()}%`);

      if (!customersMatch || customersMatch.length === 0) {
        return { success: true, data: [], total: 0 };
      }
      const matchingCustomerIds = customersMatch.map(c => c.customerId);
      query = query.in("customerId", matchingCustomerIds);
    }

    const { data, error, count } = await query
      .order("scanTimestamp", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { success: true, data: (data || []) as BiometricAttendanceLogRow[], total: count || 0 };
  } catch (error: any) {
    console.error('[Biometric API] getBiometricAttendanceLogs error:', error);
    return { success: false, data: [], total: 0, error: error.message };
  }
};
