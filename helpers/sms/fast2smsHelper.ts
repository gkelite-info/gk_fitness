import * as Crypto from 'expo-crypto';
import { createOtp, verifyOtp, OtpPurpose, OtpRecord } from '@/helpers/otpHelper';

/**
 * Fast2SMS Gateway Configuration and Service Helper
 * Official Fast2SMS Bulk SMS V2 API Integration
 * API Documentation: https://www.fast2sms.com/dashboard/dev-api
 */

export interface Fast2SmsConfig {
  apiKey: string;
  apiUrl: string;
  walletUrl: string;
  defaultRoute: 'otp' | 'q' | 'dlt';
  otpExpiryMinutes: number;
}

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const FAST2SMS_WALLET_URL = 'https://www.fast2sms.com/dev/wallet';

let dynamicApiKey: string | null = null;

/**
 * Set the Fast2SMS API key dynamically at runtime
 */
export const setFast2SmsApiKey = (key: string): void => {
  dynamicApiKey = key;
};

/**
 * Retrieve the active Fast2SMS API Key from runtime or environment variables
 */
export const getFast2SmsApiKey = (): string => {
  return (
    dynamicApiKey ||
    process.env.EXPO_PUBLIC_FAST2SMS_API_KEY ||
    process.env.FAST2SMS_API_KEY ||
    process.env.NEXT_PUBLIC_FAST2SMS_API_KEY ||
    ''
  );
};

export interface PhoneValidationResult {
  isValid: boolean;
  phone: string;
  error?: string;
}

/**
 * Validates and sanitizes Indian phone numbers into a 10-digit format
 * accepted by the Fast2SMS API.
 */
export const sanitizeIndianPhoneNumber = (rawPhone: string): PhoneValidationResult => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, phone: '', error: 'Mobile number is required.' };
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Strip +91 or 91 country code prefix if 12 digits
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    // Strip leading 0 if 11 digits
    digits = digits.slice(1);
  }

  if (digits.length !== 10) {
    return {
      isValid: false,
      phone: digits,
      error: 'Mobile number must be exactly 10 digits.',
    };
  }

  if (!['6', '7', '8', '9'].includes(digits[0])) {
    return {
      isValid: false,
      phone: digits,
      error: 'Mobile number must start with 6, 7, 8, or 9.',
    };
  }

  return { isValid: true, phone: digits };
};

/**
 * Generates a cryptographically random numeric OTP code
 */
export const generateNumericOtp = (length: number = 6): string => {
  try {
    const randomBytes = Crypto.getRandomBytes(length);
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += (randomBytes[i] % 10).toString();
    }
    // Prevent leading zero if length is 6 so it renders clearly
    if (otp[0] === '0') {
      const nonZero = ((randomBytes[0] % 9) + 1).toString();
      otp = nonZero + otp.slice(1);
    }
    return otp;
  } catch {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
};

export interface Fast2SmsApiResponse {
  return: boolean;
  request_id?: string;
  message?: string | string[];
  status_code?: number;
}

export interface SendFast2SmsParams {
  phone: string;
  otp: string;
  route?: 'otp' | 'q' | 'dlt';
  customMessage?: string;
  senderId?: string;
  apiKey?: string;
}

export interface SendSmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  data?: any;
}

/**
 * Dispatches an SMS via Fast2SMS API endpoint
 */
export async function sendFast2Sms({
  phone,
  otp,
  route = 'otp',
  customMessage,
  senderId,
  apiKey,
}: SendFast2SmsParams): Promise<SendSmsResult> {
  const resolvedApiKey = apiKey || getFast2SmsApiKey();

  if (!resolvedApiKey) {
    const errMsg = 'Fast2SMS API Key not found. Please set EXPO_PUBLIC_FAST2SMS_API_KEY in your .env file.';
    console.warn('[Fast2SMS]', errMsg);
    return {
      success: false,
      message: errMsg,
    };
  }

  const phoneValidation = sanitizeIndianPhoneNumber(phone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      message: phoneValidation.error || 'Invalid phone number.',
    };
  }

  try {
    let payload: Record<string, any> = {};

    if (route === 'otp') {
      // Dedicated Fast2SMS Quick OTP route
      payload = {
        variables_values: otp,
        route: 'otp',
        numbers: phoneValidation.phone,
      };
    } else if (route === 'q') {
      // Quick transactional message route
      payload = {
        route: 'q',
        message: customMessage || `Your GK Fitness verification OTP is ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
        language: 'english',
        flash: 0,
        numbers: phoneValidation.phone,
      };
    } else if (route === 'dlt') {
      // DLT template route (if template ID and sender ID are approved)
      payload = {
        route: 'dlt',
        sender_id: senderId,
        message: customMessage, // DLT Template ID
        variables_values: otp,
        flash: 0,
        numbers: phoneValidation.phone,
      };
    }

    const response = await fetch(FAST2SMS_API_URL, {
      method: 'POST',
      headers: {
        'authorization': resolvedApiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: Fast2SmsApiResponse = await response.json();

    const normalizedMsg = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || (data.return ? 'SMS sent successfully.' : 'SMS delivery failed.');

    if (data.return) {
      return {
        success: true,
        message: normalizedMsg,
        requestId: data.request_id,
        data,
      };
    } else {
      return {
        success: false,
        message: normalizedMsg || `Fast2SMS error code: ${data.status_code || response.status}`,
        data,
      };
    }
  } catch (error: any) {
    console.error('[Fast2SMS] API request exception:', error);
    return {
      success: false,
      message: error?.message || 'Network error connecting to Fast2SMS gateway.',
    };
  }
}

/**
 * Checks the Fast2SMS account wallet balance
 */
export async function checkFast2SmsWalletBalance(apiKey?: string): Promise<{ success: boolean; balance?: number; message?: string }> {
  const resolvedApiKey = apiKey || getFast2SmsApiKey();
  if (!resolvedApiKey) {
    return { success: false, message: 'Fast2SMS API Key not configured.' };
  }

  try {
    const res = await fetch(FAST2SMS_WALLET_URL, {
      method: 'GET',
      headers: {
        'authorization': resolvedApiKey.trim(),
      },
    });
    const data = await res.json();
    if (data.return) {
      return {
        success: true,
        balance: parseFloat(data.wallet || '0'),
      };
    }
    return {
      success: false,
      message: Array.isArray(data.message) ? data.message.join(', ') : data.message,
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch wallet balance.' };
  }
}

export interface TriggerRegistrationOtpParams {
  phone: string;
  purpose?: OtpPurpose;
  userId?: string | null;
  expiryMinutes?: number;
  route?: 'otp' | 'q';
}

export interface TriggerOtpResponse {
  success: boolean;
  message: string;
  otpCode?: string;
  optId?: string;
  otpRecord?: OtpRecord | null;
}

/**
 * Triggers an OTP to the mobile number:
 * 1. Validates the 10-digit mobile number
 * 2. Generates a 6-digit numeric OTP
 * 3. Sends the SMS via Fast2SMS gateway
 * 4. Stores the OTP in Supabase `otps` table with 5-minute expiration
 */
export async function sendMobileRegistrationOtp({
  phone,
  purpose = 'register',
  userId = null,
  expiryMinutes = 5,
  route = 'otp',
}: TriggerRegistrationOtpParams): Promise<TriggerOtpResponse> {
  const phoneValidation = sanitizeIndianPhoneNumber(phone);
  if (!phoneValidation.isValid) {
    return { success: false, message: phoneValidation.error || 'Invalid phone number.' };
  }

  const otpCode = generateNumericOtp(6);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Send SMS via Fast2SMS
  const smsResult = await sendFast2Sms({
    phone: phoneValidation.phone,
    otp: otpCode,
    route,
  });

  if (!smsResult.success) {
    return {
      success: false,
      message: smsResult.message || 'Failed to deliver OTP to mobile number.',
    };
  }

  // Save in Supabase `otps` table for verification
  try {
    const record = await createOtp({
      recipient: phoneValidation.phone,
      otpCode: otpCode,
      type: 'sms',
      purpose: purpose,
      expiresAt: expiresAt,
      userId: userId || null,
      isUsed: false,
      attempts: 0,
    });

    return {
      success: true,
      message: `OTP sent successfully to +91 ${phoneValidation.phone}.`,
      otpCode: __DEV__ ? otpCode : undefined,
      optId: record?.optId,
      otpRecord: record,
    };
  } catch (dbErr: any) {
    console.error('[sendMobileRegistrationOtp] Failed to save OTP in database:', dbErr);
    return {
      success: false,
      message: 'SMS sent but failed to record OTP in database. Please try again.',
    };
  }
}

/**
 * Verifies the mobile registration OTP against Supabase `otps` table
 */
export async function verifyMobileRegistrationOtp(
  phone: string,
  enteredOtp: string,
  purpose: OtpPurpose = 'register'
): Promise<{ success: boolean; message: string; data?: any }> {
  const phoneValidation = sanitizeIndianPhoneNumber(phone);
  if (!phoneValidation.isValid) {
    return { success: false, message: phoneValidation.error || 'Invalid phone number.' };
  }

  const trimmedOtp = (enteredOtp || '').trim();
  if (!trimmedOtp) {
    return { success: false, message: 'Please enter the 6-digit OTP.' };
  }

  return await verifyOtp(phoneValidation.phone, trimmedOtp, purpose);
}

const Fast2SmsService = {
  sendFast2Sms,
  sendMobileRegistrationOtp,
  verifyMobileRegistrationOtp,
  generateNumericOtp,
  sanitizeIndianPhoneNumber,
  checkFast2SmsWalletBalance,
  setFast2SmsApiKey,
  getFast2SmsApiKey,
};

export default Fast2SmsService;

