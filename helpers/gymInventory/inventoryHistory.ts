import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface GymInventoryHistoryAttributes {
  historyId?: string;
  gymInventoryId: string;
  action: 'added' | 'reduced' | 'maintenance' | 'out_of_service' | 'restore_maintenance' | 'restore_out_of_service';
  quantity: number;
  createdBy: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface LogGymInventoryHistoryParams {
  gymInventoryId: string;
  action: string;
  quantity: number;
  createdBy?: string | null;
  userId?: string | null;
}

export async function logGymInventoryHistory(params: LogGymInventoryHistoryParams) {
  const now = new Date().toISOString();

  let resolvedCreatedBy = params.createdBy || params.userId;

  // 1. Fallback to Supabase auth user
  if (!resolvedCreatedBy) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      resolvedCreatedBy = authData?.user?.id;
    } catch (e) {
      console.warn('[inventoryHistoryHelper] auth.getUser failed:', e);
    }
  }

  // 2. Fallback to equipment's createdBy
  if (!resolvedCreatedBy && params.gymInventoryId) {
    try {
      const { data: inv } = await supabase
        .from('gym_inventories')
        .select('createdBy')
        .eq('gymInventoryId', params.gymInventoryId)
        .maybeSingle();
      resolvedCreatedBy = inv?.createdBy;
    } catch (e) {
      console.warn('[inventoryHistoryHelper] inv fallback failed:', e);
    }
  }

  if (!resolvedCreatedBy) {
    console.error('[inventoryHistoryHelper] Cannot log inventory history: createdBy is missing and could not be resolved.');
    throw new Error('User ID (createdBy) is required to record inventory history.');
  }

  const { data, error } = await supabase
    .from('gym_inventory_histories')
    .insert([
      {
        historyId: Crypto.randomUUID(),
        gymInventoryId: params.gymInventoryId,
        action: params.action,
        quantity: params.quantity,
        createdBy: resolvedCreatedBy,
        createdAt: now,
        updatedAt: now,
      },
    ])
    .select();

  if (error) {
    console.error('[inventoryHistoryHelper] logGymInventoryHistory Error:', error);
    throw error;
  }

  return data ? data[0] : null;
}

export async function fetchGymInventoryHistory(gymInventoryId: string) {
  const { data, error } = await supabase
    .from('gym_inventory_histories')
    .select('*')
    .eq('gymInventoryId', gymInventoryId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('[inventoryHistoryHelper] fetchGymInventoryHistory Error:', error);
    throw error;
  }

  return data || [];
}

export interface UpdateGymInventoryStockParams {
  gymInventoryId: string;
  action: 'add' | 'reduce' | 'maintenance' | 'out_of_service' | 'restore_maintenance' | 'restore_out_of_service' | 'restore' | string;
  quantity: number;
  createdBy?: string | null;
  userId?: string | null;
  restoreSource?: 'maintenance' | 'out_of_service';
}

export async function updateGymInventoryStock(params: UpdateGymInventoryStockParams) {
  const { gymInventoryId, action, quantity } = params;
  const now = new Date().toISOString();

  // 1. Fetch current equipment to verify it exists and get fallback createdBy
  const { data: currentInventory, error: fetchError } = await supabase
    .from('gym_inventories')
    .select('quantity, createdBy')
    .eq('gymInventoryId', gymInventoryId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (fetchError || !currentInventory) {
    console.error('[inventoryHistoryHelper] updateGymInventoryStock Error: Equipment not found or fetch error:', fetchError);
    throw new Error('Equipment not found');
  }

  // 2. Resolve createdBy with fallback to currentInventory or auth session
  let resolvedCreatedBy = params.createdBy || params.userId;
  if (!resolvedCreatedBy) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      resolvedCreatedBy = authData?.user?.id;
    } catch (e) {
      console.warn('[inventoryHistoryHelper] auth.getUser failed:', e);
    }
  }
  if (!resolvedCreatedBy) {
    resolvedCreatedBy = currentInventory.createdBy;
  }
  if (!resolvedCreatedBy) {
    throw new Error('User ID (createdBy) is required to update inventory stock.');
  }

  // 3. Compute new quantity and normalized history action
  let updatedQuantity = currentInventory.quantity;
  let historyAction = action as string;

  if (action === 'add') {
    updatedQuantity += quantity;
    historyAction = 'added';
  } else if (action === 'reduce') {
    updatedQuantity = Math.max(0, updatedQuantity - quantity);
    historyAction = 'reduced';
  } else if (action === 'maintenance') {
    historyAction = 'maintenance';
  } else if (action === 'out_of_service') {
    historyAction = 'out_of_service';
  } else if (action === 'restore') {
    historyAction = params.restoreSource === 'out_of_service' ? 'restore_out_of_service' : 'restore_maintenance';
  } else if (action === 'restore_maintenance') {
    historyAction = 'restore_maintenance';
  } else if (action === 'restore_out_of_service') {
    historyAction = 'restore_out_of_service';
  }

  // 4. Update the main table if total unit count changes
  if (action === 'add' || action === 'reduce') {
    const { data: updatedData, error: updateError } = await supabase
      .from('gym_inventories')
      .update({
        quantity: updatedQuantity,
        updatedAt: now,
      })
      .eq('gymInventoryId', gymInventoryId)
      .select();

    if (updateError) {
      console.error('[inventoryHistoryHelper] update main table quantity Error:', updateError);
      throw updateError;
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('[inventoryHistoryHelper] Update failed: 0 rows updated. Check if row exists or RLS permissions.');
      throw new Error('Update failed: No permission or equipment not found');
    }
  }

  // 5. Always record the history entry with guaranteed non-null createdBy
  await logGymInventoryHistory({
    gymInventoryId,
    action: historyAction,
    quantity,
    createdBy: resolvedCreatedBy,
  });

  return { success: true };
}
