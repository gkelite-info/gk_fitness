import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymInventoryAttributes {
  gymInventoryId?: string;
  gymId: string;
  equipmentName: string;
  quantity: number;
  purchaseDate: string;
  notes?: string | null;
  image?: string | null;
  createdBy: string;
  is_Active?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveGymInventoryParams {
  gymInventoryId?: string;
  gymId: string;
  equipmentName: string;
  quantity: number;
  purchaseDate: string;
  notes?: string | null;
  image?: string | null;
  createdBy: string;
  is_Active?: boolean;
}

export async function fetchGymInventories(gymId?: string) {
  let query = supabase
    .from('gym_inventories')
    .select('*')
    .eq('is_deleted', false)
    .order('createdAt', { ascending: false });

  if (gymId) {
    query = query.eq('gymId', gymId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[gymInventoryHelper] fetchGymInventories Error:', error);
    throw error;
  }

  return data ?? [];
}

export async function fetchGymInventoryById(gymInventoryId: string) {
  const { data, error } = await supabase
    .from('gym_inventories')
    .select('*')
    .eq('gymInventoryId', gymInventoryId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymInventoryHelper] fetchGymInventoryById Error:', error);
    throw error;
  }

  return data;
}

export async function saveGymInventory(inventoryData: SaveGymInventoryParams) {
  const now = new Date().toISOString();

  let isUpdate = false;
  if (inventoryData.gymInventoryId) {
    const { data } = await supabase
      .from('gym_inventories')
      .select('gymInventoryId')
      .eq('gymInventoryId', inventoryData.gymInventoryId)
      .eq('is_deleted', false)
      .maybeSingle();
      
    if (data) {
      isUpdate = true;
    }
  }

  if (isUpdate && inventoryData.gymInventoryId) {
    const { data, error } = await supabase
      .from('gym_inventories')
      .update({
        gymId: inventoryData.gymId,
        equipmentName: inventoryData.equipmentName,
        quantity: inventoryData.quantity,
        purchaseDate: inventoryData.purchaseDate,
        notes: inventoryData.notes,
        image: inventoryData.image,
        is_Active: inventoryData.is_Active ?? true,
        updatedAt: now,
      })
      .eq('gymInventoryId', inventoryData.gymInventoryId)
      .eq('createdBy', inventoryData.createdBy)
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  } else {
    const generatedGymInventoryId = inventoryData.gymInventoryId || Crypto.randomUUID();
    const insertPayload = {
      gymInventoryId: generatedGymInventoryId,
      gymId: inventoryData.gymId,
      equipmentName: inventoryData.equipmentName,
      quantity: inventoryData.quantity,
      purchaseDate: inventoryData.purchaseDate,
      notes: inventoryData.notes || null,
      image: inventoryData.image || null,
      createdBy: inventoryData.createdBy,
      is_Active: inventoryData.is_Active ?? true,
      is_deleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from('gym_inventories')
      .insert([insertPayload])
      .select();

    if (error) {
      throw error;
    }

    return data ? data[0] : null;
  }
}

export async function deleteGymInventory(gymInventoryId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_inventories')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymInventoryId', gymInventoryId)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}

export async function toggleGymInventoryActiveStatus(gymInventoryId: string, currentStatus: boolean) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('gym_inventories')
    .update({
      is_Active: !currentStatus,
      updatedAt: now,
    })
    .eq('gymInventoryId', gymInventoryId)
    .select();

  if (error) {
    throw error;
  }

  return data ? data[0] : null;
}

export async function uploadEquipmentImage(fileData: ArrayBuffer | Blob, fileName: string) {
  try {
    const { data, error } = await supabase.storage
      .from('equipment')
      .upload(fileName, fileData, {
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('equipment')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    throw error;
  }
}

export async function deleteEquipmentImage(imagePath: string) {
  const { data, error } = await supabase.storage
    .from('equipment')
    .remove([imagePath]);

  if (error) {
    console.error('[gymInventoryHelper] deleteEquipmentImage Error:', error);
    throw error;
  }

  return data;
}
