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
    
    // Determine if there's already an entry for today (or the provided date)
    const targetDateStr = (loggedAt ? new Date(loggedAt) : new Date()).toISOString().split('T')[0];
    const targetDateStart = `${targetDateStr}T00:00:00.000Z`;
    const targetDateEnd = `${targetDateStr}T23:59:59.999Z`;

    const { data: existingEntry } = await supabase
      .from('customer_measurements')
      .select('*')
      .eq('userId', userId)
      .gte('loggedAt', targetDateStart)
      .lte('loggedAt', targetDateEnd)
      .limit(1)
      .maybeSingle();

    if (existingEntry) {
      // Update existing
      const { data, error } = await supabase
        .from('customer_measurements')
        .update({
          ...measurements,
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
        userId,
        loggedAt: loggedAt || now,
        createdAt: now,
        updatedAt: now,
        ...(latest || {}), // default to previous values
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
    return data || [];
  },

  async uploadPhotoFile(userId: string, base64Image: string, fileName: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(`${userId}/${fileName}`, decode(base64Image), {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: publicData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  },

  async logProgressPhoto(userId: string, publicUrl: string, loggedAt?: string): Promise<ProgressPhoto> {
    const now = new Date().toISOString();
    const newEntry = {
      workoutProgressPhotoId: Crypto.randomUUID(),
      userId,
      imageUrl: publicUrl,
      loggedAt: loggedAt || now,
      createdAt: now,
      updatedAt: now
    };

    const { data, error } = await supabase
      .from('customer_progress_photos')
      .insert(newEntry)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
