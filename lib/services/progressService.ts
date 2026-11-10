import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';

export interface CustomerMeasurement {
  customerMeasurementId: string;
  userId: string;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  biceps?: number;
  forearms?: number;
  thighs?: number;
  calves?: number;
  bodyFatPercentage?: number;
  loggedAt: string;
  notes?: string;
  createdAt: string;
}

export interface ProgressPhoto {
  workoutProgressPhotoId: string;
  userId: string;
  imageUrl: string;
  loggedAt: string;
  createdAt: string;
}

export function resolveProgressPhotoUrl(imageUrl?: string | null, userId?: string | null): string {
  if (!imageUrl) return '';
  const clean = imageUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('file:')) {
    return clean;
  }
  const pathInBucket = clean.includes('/') ? clean : (userId ? `${userId}/${clean}` : clean);
  const { data } = supabase.storage.from('progress-photos').getPublicUrl(pathInBucket);
  return data?.publicUrl || clean;
}

export const progressService = {
  // Measurements
  async getLatestMeasurements(userId: string): Promise<CustomerMeasurement | null> {
    const { data, error } = await supabase
      .from('customer_measurements')
      .select('*')
      .eq('userId', userId)
      .order('loggedAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error; // ignore 0 rows error
    return data;
  },

  async getMeasurementHistory(userId: string): Promise<CustomerMeasurement[]> {
    const { data, error } = await supabase
      .from('customer_measurements')
      .select('*')
      .eq('userId', userId)
      .order('loggedAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async logMeasurements(userId: string, measurements: Partial<CustomerMeasurement>, loggedAt?: string): Promise<CustomerMeasurement> {
    const now = new Date().toISOString();
    
    // Determine target date for matching existing entry on that calendar day
    const targetDate = loggedAt ? new Date(loggedAt) : new Date();

    const isSameDay = (timestampStr?: string | null): boolean => {
      if (!timestampStr) return false;
      try {
        const cleanStr = String(timestampStr).trim().replace(' ', 'T');
        const d = new Date(cleanStr);
        if (isNaN(d.getTime())) return false;
        const isLocalMatch =
          d.getFullYear() === targetDate.getFullYear() &&
          d.getMonth() === targetDate.getMonth() &&
          d.getDate() === targetDate.getDate();
        if (isLocalMatch) return true;
        const targetYear = targetDate.getFullYear();
        const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
        const targetDay = String(targetDate.getDate()).padStart(2, '0');
        const prefix = `${targetYear}-${targetMonth}-${targetDay}`;
        if (cleanStr.startsWith(prefix) || d.toISOString().startsWith(prefix)) return true;
        return (
          d.getUTCFullYear() === targetDate.getFullYear() &&
          d.getUTCMonth() === targetDate.getMonth() &&
          d.getUTCDate() === targetDate.getDate()
        );
      } catch {
        return false;
      }
    };

    const { data: existingRows } = await supabase
      .from('customer_measurements')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    const existingEntry = (existingRows || []).find((entry: any) => {
      return isSameDay(entry.loggedAt) || isSameDay(entry.createdAt);
    });

    if (existingEntry) {
      // Update existing
      const { data, error } = await supabase
        .from('customer_measurements')
        .update({
          ...measurements,
          loggedAt: loggedAt || existingEntry.loggedAt || now,
          updatedAt: now
        })
        .eq('customerMeasurementId', existingEntry.customerMeasurementId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } else {
      const latest = await this.getLatestMeasurements(userId);
      const newEntry = {
        ...(latest || {}), // default to previous values
        userId,
        loggedAt: loggedAt || now,
        createdAt: loggedAt || now,
        updatedAt: now,
        ...measurements, // override with new
        customerMeasurementId: Crypto.randomUUID() // ensure fresh ID
      };
      
      const { data, error } = await supabase
        .from('customer_measurements')
        .insert(newEntry)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    }
  },

  // Photos
  async getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
    const { data, error } = await supabase
      .from('customer_progress_photos')
      .select('*')
      .eq('userId', userId)
      .order('loggedAt', { ascending: false });

    if (error) throw error;
    return (data || []).map((photo: ProgressPhoto) => ({
      ...photo,
      imageUrl: resolveProgressPhotoUrl(photo.imageUrl, photo.userId || userId),
    }));
  },

  async uploadPhotoFile(userId: string, base64Image: string, fileName: string): Promise<string> {
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const cleanFileName = fileName.includes('/') ? fileName.split('/').pop()! : fileName;
    const storagePath = `${userId}/${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(storagePath, decode(cleanBase64), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('[progressService] Storage upload error:', error);
      throw error;
    }

    return cleanFileName;
  },

  async logProgressPhoto(userId: string, fileNameOrUrl: string, loggedAt?: string): Promise<ProgressPhoto> {
    const now = new Date().toISOString();
    // Save only the filename e.g. 'progress-1794231481.jpg' into customer_progress_photos
    const storedFileName = fileNameOrUrl.includes('/') ? fileNameOrUrl.split('/').pop()! : fileNameOrUrl;

    const newEntry = {
      workoutProgressPhotoId: Crypto.randomUUID(),
      userId,
      imageUrl: storedFileName,
      loggedAt: loggedAt || now,
      createdAt: loggedAt || now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('customer_progress_photos')
      .insert(newEntry)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      imageUrl: resolveProgressPhotoUrl(data.imageUrl, data.userId || userId),
    };
  }
};
