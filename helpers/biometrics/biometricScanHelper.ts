import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface ScanPayload {
  deviceSerialNumber?: string;
  deviceID?: string;
  serialNo?: string;
  employeeNo?: string;
  EmployeeNoString?: string;
  deviceUserId?: string;
  scanTimestamp?: string;
  dateTime?: string;
  time?: string;
  authMethod?: string;
  EventNotificationAlert?: {
    dateTime?: string;
    AccessControllerEvent?: {
      serialNo?: string;
      employeeNoString?: string;
      EmployeeNoString?: string;
      time?: string;
      subEventType?: number;
      currentVerifyMode?: string;
      cardNo?: string;
    };
  };
  AccessControllerEvent?: {
    serialNo?: string;
    employeeNoString?: string;
    EmployeeNoString?: string;
    time?: string;
    subEventType?: number;
    currentVerifyMode?: string;
    cardNo?: string;
  };
}

const md5 = async (str: string) => {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, str);
};

export const deviceDigestFetch = async (
  device: { deviceIp: string; devicePort: number; deviceUsername?: string | null; devicePassword?: string | null },
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  payload?: any
) => {
  const ip = device.deviceIp;
  const port = device.devicePort;
  const username = device.deviceUsername || 'admin';
  const password = device.devicePassword || '7093256562@Shiva';

  const url = `http://${ip}:${port}/ISAPI/${endpoint}`;
  const uri = `/ISAPI/${endpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
  }

  const initialResponse = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (initialResponse.ok) {
    const text = await initialResponse.text();
    try { return JSON.parse(text); } catch { return { rawXml: text }; }
  }

  if (initialResponse.status !== 401) {
    const text = await initialResponse.text();
    throw new Error(`Device responded with status ${initialResponse.status}: ${text}`);
  }

  let authHeader = initialResponse.headers.get('www-authenticate') || '';
  if (!authHeader) {
    throw new Error("No Digest Challenge received from device");
  }

  const getParam = (str: string, param: string) => {
    const match = str.match(new RegExp(`${param}="?([^",]+)"?`));
    return match ? match[1] : '';
  };

  const realm = getParam(authHeader, 'realm');
  const nonce = getParam(authHeader, 'nonce');
  const qop = getParam(authHeader, 'qop');
  const opaque = getParam(authHeader, 'opaque');
  const nc = '00000001';
  const cnonce = Math.random().toString(36).substring(2, 15);

  const ha1 = await md5(`${username}:${realm}:${password}`);
  const ha2 = await md5(`${method}:${uri}`);

  const responseHash = qop
    ? await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : await md5(`${ha1}:${nonce}:${ha2}`);

  let authStr = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${responseHash}"`;
  if (qop) authStr += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  if (opaque) authStr += `, opaque="${opaque}"`;

  headers['Authorization'] = authStr;

  const secondResponse = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const text = await secondResponse.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { rawXml: text }; }

  if (!secondResponse.ok) {
    throw new Error(`Device authentication rejected status ${secondResponse.status}: ${text}`);
  }

  return data;
};

const lastScanMap = new Map<string, number>();

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
    console.error('[Biometric Scan Helper] Error parsing time string:', timeStr, e);
    return 0;
  }
};

export const processBiometricScan = async (body: ScanPayload) => {
  try {
    let deviceSerialNumber = body.deviceSerialNumber || body.deviceID || body.serialNo;
    let deviceUserId = body.employeeNo || body.EmployeeNoString || body.deviceUserId;
    let scanTimestampStr = body.scanTimestamp || body.dateTime || body.time;
    let authMethod = body.authMethod || 'fingerprint';

    if (body.EventNotificationAlert?.AccessControllerEvent) {
      const evt = body.EventNotificationAlert.AccessControllerEvent;
      deviceSerialNumber = evt.serialNo || deviceSerialNumber;
      deviceUserId = evt.employeeNoString || evt.EmployeeNoString || deviceUserId;
      scanTimestampStr = evt.time || body.EventNotificationAlert.dateTime || scanTimestampStr;

      if ([75, 76, 77].includes(evt.subEventType as number)) authMethod = "face";
      else if ([38, 39, 44].includes(evt.subEventType as number)) authMethod = "fingerprint";
      else if ([1, 41, 42].includes(evt.subEventType as number)) authMethod = "card";
    } else if (body.AccessControllerEvent) {
      const evt = body.AccessControllerEvent;
      deviceSerialNumber = deviceSerialNumber || evt.serialNo;
      deviceUserId = evt.employeeNoString || evt.EmployeeNoString || deviceUserId;
      scanTimestampStr = evt.time || body.dateTime || scanTimestampStr;

      if ([75, 76, 77].includes(evt.subEventType as number)) authMethod = "face";
      else if ([38, 39, 44].includes(evt.subEventType as number)) authMethod = "fingerprint";
      else if ([1, 41, 42].includes(evt.subEventType as number)) authMethod = "card";
    }

    if (!deviceSerialNumber || !deviceUserId || !scanTimestampStr) {
      console.error('[Biometric Scan Helper] Missing fields in payload:', { deviceSerialNumber, deviceUserId, scanTimestampStr });
      return { success: false, reason: 'MissingRequiredFields' };
    }

    const scanTimestamp = new Date(scanTimestampStr).toISOString();

    const { data: device, error: devErr } = await supabase
      .from("gym_biometric_devices")
      .select("*")
      .eq("deviceSerialNumber", deviceSerialNumber)
      .eq("is_deleted", false)
      .maybeSingle();

    if (devErr || !device) {
      console.error(`[Biometric Scan Helper] Device not found with Serial: ${deviceSerialNumber}`, devErr);
      return { success: false, reason: 'DeviceNotFound' };
    }

    await supabase
      .from("gym_biometric_devices")
      .update({
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
      })
      .eq("deviceId", device.deviceId);

    const { data: credential, error: credErr } = await supabase
      .from("gym_biometric_credentials")
      .select(`
        *,
        customer:gym_customers(*)
      `)
      .eq("gymId", device.gymId)
      .eq("deviceId", device.deviceId)
      .eq("deviceUserId", String(deviceUserId))
      .eq("is_deleted", false)
      .maybeSingle();
    if (credErr || !credential) {
      console.warn(`[Biometric Scan Helper] Skipping scan log. Credential not found for deviceUserId: ${deviceUserId} on device: ${device.deviceName}`);
      return { success: false, reason: 'CredentialNotFound' };
    }

    const customerId = credential.customerId;

    const { data: existingLog, error: existErr } = await supabase
      .from("gym_biometric_attendance_logs")
      .select("logId")
      .eq("deviceId", device.deviceId)
      .eq("customerId", customerId)
      .eq("scanTimestamp", scanTimestamp)
      .maybeSingle();

    if (existErr) {
      console.error('[Biometric Scan Helper] Error checking existing log:', existErr);
    }

    if (existingLog) {
      return { success: true };
    }

    let normalizedAuthMethod = 'fingerprint';
    if (authMethod) {
      const am = String(authMethod).toLowerCase();
      if (am === 'face' || am === 'facerecognition') {
        normalizedAuthMethod = 'face';
      } else if (am === 'fingerprint' || am === 'fp') {
        normalizedAuthMethod = 'fingerprint';
      } else if (am === 'card') {
        normalizedAuthMethod = 'card';
      } else if (am === 'faceorfporcardorpw') {
        if (device.deviceType === 'facerecognition') {
          normalizedAuthMethod = 'face';
        } else if (device.deviceType === 'fingerprint') {
          normalizedAuthMethod = 'fingerprint';
        } else {
          normalizedAuthMethod = 'face';
        }
      } else {
        if (am.includes('face')) normalizedAuthMethod = 'face';
        else if (am.includes('finger') || am.includes('fp')) normalizedAuthMethod = 'fingerprint';
        else if (am.includes('card')) normalizedAuthMethod = 'card';
      }
    }

    const logId = Crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const { data: newLog, error: logErr } = await supabase
      .from("gym_biometric_attendance_logs")
      .insert([{
        logId,
        gymId: device.gymId,
        deviceId: device.deviceId,
        customerId: customerId,
        scanTimestamp,
        logType: device.gateDirection === 'out' ? 'check_out' : 'check_in',
        authMethod: normalizedAuthMethod,
        processedStatus: 'Pending',
        createdAt: nowIso,
        updatedAt: nowIso,
      }])
      .select()
      .single();

    if (logErr) {
      console.error('[Biometric Scan Helper] Error inserting log:', logErr);
      return { success: false, reason: 'LogInsertionFailed' };
    }

    const scanDateOnly = scanTimestampStr.split('T')[0];

    const { data: existingAttendance, error: attErr } = await supabase
      .from("gym_attendance")
      .select("attendanceId")
      .eq("gymId", device.gymId)
      .eq("customerId", customerId)
      .eq("markedAt", scanTimestamp)
      .maybeSingle();

    if (!existingAttendance && !attErr) {
      await supabase
        .from("gym_attendance")
        .insert([{
          attendanceId: Crypto.randomUUID(),
          gymId: device.gymId,
          customerId,
          markedAt: scanTimestamp,
          date: scanDateOnly
        }]);
    }

    const currentDate = new Date(scanTimestamp);
    const currentScanTimeMs = currentDate.getTime();
    const dedupeKey = `${customerId}-${device.deviceId}`;
    const lastScanTime = lastScanMap.get(dedupeKey);

    if (lastScanTime && Math.abs(currentScanTimeMs - lastScanTime) < 20000) {
      await supabase
        .from("gym_biometric_attendance_logs")
        .update({
          processedStatus: 'Rejected',
          rejectionReason: 'DuplicateScan',
          updatedAt: new Date().toISOString(),
        })
        .eq("logId", logId);
      return { success: false, reason: 'DuplicateScan' };
    }
    lastScanMap.set(dedupeKey, currentScanTimeMs);

    const { data: checkInRule, error: ruleErr } = await supabase
      .from('gym_check_in_rules')
      .select('*')
      .eq('gymId', device.gymId)
      .is('deletedAt', null)
      .maybeSingle();

    if (ruleErr) {
      console.error('[Biometric Scan Helper] Error fetching gym check-in rules:', ruleErr);
    }

    const gapMinutes = checkInRule?.minGapMinutes || 0;
    const gapMs = gapMinutes > 0 ? gapMinutes * 60 * 1000 : 20000;

    const minGapBefore = new Date(currentScanTimeMs - gapMs).toISOString();
    const minGapAfter = new Date(currentScanTimeMs + gapMs).toISOString();

    const { data: duplicateDbScan } = await supabase
      .from("gym_biometric_attendance_logs")
      .select("logId")
      .eq("customerId", customerId)
      .eq("deviceId", device.deviceId)
      .eq("processedStatus", "Accepted")
      .gte("scanTimestamp", minGapBefore)
      .lte("scanTimestamp", minGapAfter)
      .neq("logId", logId)
      .limit(1);

    if (duplicateDbScan && duplicateDbScan.length > 0) {
      console.warn(`[Biometric Scan Helper] Duplicate scan detected within gap window (${gapMinutes} mins)`);
      await supabase
        .from("gym_biometric_attendance_logs")
        .update({
          processedStatus: 'Rejected',
          rejectionReason: 'DuplicateScan',
          updatedAt: new Date().toISOString(),
        })
        .eq("logId", logId);
      return { success: false, reason: 'DuplicateScan' };
    }

    const { data: membershipData, error: membershipError } = await supabase
      .from('gym_customer_membership_plans')
      .select('is_Active, endDate')
      .eq('gymId', device.gymId)
      .eq('customerId', customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (membershipError || !membershipData) {
      console.warn(`[Biometric Scan Helper] Customer ${customerId} has no membership at gym ${device.gymId}`);
      await supabase
        .from("gym_biometric_attendance_logs")
        .update({
          processedStatus: 'Rejected',
          rejectionReason: 'NoActiveMembership',
          updatedAt: new Date().toISOString(),
        })
        .eq("logId", logId);
      return { success: false, reason: 'NoActiveMembership' };
    }

    if (membershipData.is_Active && membershipData.endDate) {
      const endDate = new Date(membershipData.endDate);
      if (currentDate > endDate) {
        membershipData.is_Active = false;
        supabase
          .from('gym_customer_membership_plans')
          .update({ is_Active: false })
          .eq('gymId', device.gymId)
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
      console.warn(`[Biometric Scan Helper] Customer ${customerId} membership is inactive/expired`);
      await supabase
        .from("gym_biometric_attendance_logs")
        .update({
          processedStatus: 'Rejected',
          rejectionReason: 'NoActiveMembership',
          updatedAt: new Date().toISOString(),
        })
        .eq("logId", logId);
      return { success: false, reason: 'NoActiveMembership' };
    }

    let localHours = 0;
    let localMinutes = 0;
    let currentDayName = 'Monday';

    try {
      const parts = scanTimestampStr.split('T');
      const datePart = parts[0];
      const timePart = parts[1];
      const [y, m, d] = datePart.split('-').map(Number);
      const [hStr, minStr] = timePart.split(':');
      localHours = parseInt(hStr, 10);
      localMinutes = parseInt(minStr, 10);

      const localDateObj = new Date(y, m - 1, d);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      currentDayName = daysOfWeek[localDateObj.getDay()];
    } catch (e) {
      console.error('[Biometric Scan Helper] Error parsing scanTimestampStr timezone-safely:', e);
      localHours = currentDate.getHours();
      localMinutes = currentDate.getMinutes();
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      currentDayName = daysOfWeek[currentDate.getDay()];
    }

    const { data: gymTiming, error: timingErr } = await supabase
      .from('gym_timings')
      .select('*')
      .eq('gymId', device.gymId)
      .eq('day', currentDayName)
      .is('deletedAt', null)
      .maybeSingle();

    if (timingErr) {
      console.error('[Biometric Scan Helper] Error fetching gym timings:', timingErr);
    }

    if (gymTiming) {
      if (gymTiming.isClosed) {
        console.warn(`[Biometric Scan Helper] Gym is closed on ${currentDayName}`);
        await supabase
          .from("gym_biometric_attendance_logs")
          .update({
            processedStatus: 'Rejected',
            rejectionReason: 'OutsideGymTimings',
            updatedAt: new Date().toISOString(),
          })
          .eq("logId", logId);
        return { success: false, reason: 'OutsideGymTimings' };
      }

      const scanTimeMinutes = localHours * 60 + localMinutes;
      const openMinutes = parseTimeToMinutes(gymTiming.openTime);
      const closeMinutes = parseTimeToMinutes(gymTiming.closeTime);

      if (gymTiming.openTime && gymTiming.closeTime) {
        if (scanTimeMinutes < openMinutes || scanTimeMinutes > closeMinutes) {
          console.warn(`[Biometric Scan Helper] Scan time ${localHours}:${localMinutes} is outside open hours ${gymTiming.openTime} - ${gymTiming.closeTime}`);
          await supabase
            .from("gym_biometric_attendance_logs")
            .update({
              processedStatus: 'Rejected',
              rejectionReason: 'OutsideGymTimings',
              updatedAt: new Date().toISOString(),
            })
            .eq("logId", logId);
          return { success: false, reason: 'OutsideGymTimings' };
        }
      }
    }

    await supabase
      .from("gym_biometric_attendance_logs")
      .update({
        processedStatus: 'Accepted',
        updatedAt: new Date().toISOString(),
      })
      .eq("logId", logId);

    return { success: true };

  } catch (error: any) {
    console.error('[Biometric Scan Helper] Error processing scan:', error);
    return { success: false, reason: 'SystemError', error: error.message };
  }
};

export const syncDeviceLogs = async (deviceId: string) => {
  try {
    const { data: device, error: devErr } = await supabase
      .from("gym_biometric_devices")
      .select("*")
      .eq("deviceId", deviceId)
      .eq("is_deleted", false)
      .maybeSingle();

    if (devErr || !device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const { data: latestLog } = await supabase
      .from("gym_biometric_attendance_logs")
      .select("scanTimestamp")
      .eq("deviceId", deviceId)
      .order("scanTimestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    let startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (latestLog && latestLog.scanTimestamp) {
      startTime = new Date(new Date(latestLog.scanTimestamp).getTime() - 5 * 60 * 1000);
    }

    const formatHikTime = (date: Date) => date.toISOString().split('.')[0] + '+00:00';
    const startTimeStr = formatHikTime(startTime);
    const endTimeStr = formatHikTime(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour into future

    const payload = {
      AcsEventCond: {
        searchID: `sync_logs_${Date.now()}`,
        searchResultPosition: 0,
        maxResults: 150,
        major: 5,
        minor: 0,
        startTime: startTimeStr,
        endTime: endTimeStr
      }
    };

    const res = await deviceDigestFetch(device, "AccessControl/AcsEvent?format=json", "POST", payload);
    const events = res?.AcsEvent?.InfoList || res?.AcsEventSearch?.InfoList || [];


    let processedCount = 0;
    let successCount = 0;

    for (const event of events) {
      const deviceUserId = event.employeeNoString || event.cardNo;
      if (event.major === 5 && deviceUserId && deviceUserId.trim() !== '') {
        processedCount++;

        let resolvedAuth = 'fingerprint';
        const minor = event.minor || event.subEventType;
        if ([75, 76, 77].includes(minor)) {
          resolvedAuth = 'face';
        } else if ([38, 39, 44].includes(minor)) {
          resolvedAuth = 'fingerprint';
        } else if ([1, 41, 42].includes(minor)) {
          resolvedAuth = 'card';
        } else {
          resolvedAuth = event.currentVerifyMode || 'fingerprint';
        }

        const scanPayload = {
          deviceSerialNumber: device.deviceSerialNumber,
          deviceUserId,
          scanTimestamp: event.time,
          authMethod: resolvedAuth,
        };

        const result = await processBiometricScan(scanPayload);
        if (result.success) {
          successCount++;
        }
      }
    }

    await supabase
      .from("gym_biometric_devices")
      .update({
        isOnline: true,
        lastHeartbeat: new Date().toISOString(),
      })
      .eq("deviceId", deviceId);

    return {
      success: true,
      totalEvents: events.length,
      processedEvents: processedCount,
      successfullySynced: successCount
    };

  } catch (error: any) {
    console.error(`[Biometric Scan Helper] Sync failed for device: ${deviceId}`, error);

    try {
      await supabase
        .from("gym_biometric_devices")
        .update({ isOnline: false })
        .eq("deviceId", deviceId);
    } catch { }

    return {
      success: false,
      error: error.message || "Failed to sync logs from device"
    };
  }
};
