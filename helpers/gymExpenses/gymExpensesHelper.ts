import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { base64ToArrayBuffer } from '@/components/imageCompressor';

export interface GymExpenseAttributes {
  gymExpenseId?: string;
  expenseTitle: string;
  category: 'rent' | 'salaries' | 'maintenance' | 'utilities' | 'marketing' | 'equipment' | 'supplies' | 'others' | string;
  amount: number;
  date: string;
  paymentMethod: 'upi' | 'bank' | 'cash' | 'creditcard' | 'debitcard' | string;
  notes?: string | null;
  receiptUrl?: string | null;
  gymId: string;
  createdBy: string;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
  createdBy_user?: {
    name?: string;
  } | null;
}

export interface SaveGymExpenseParams {
  gymExpenseId?: string;
  expenseTitle: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes?: string | null;
  receiptUrl?: string | null;
  gymId: string;
  createdBy: string;
}

export interface FetchGymExpensesFilters {
  category?: string;
  paymentMethod?: string;
  dateFilter?: string;
  searchQuery?: string;
}

export interface PaginatedGymExpensesResult {
  success: boolean;
  data: GymExpenseAttributes[];
  total: number;
  error?: string;
}

export async function fetchGymExpensesPaginated(
  gymId: string,
  page = 1,
  limit = 10,
  filters?: FetchGymExpensesFilters
): Promise<PaginatedGymExpensesResult> {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('gym_expenses')
      .select('*, createdBy_user:users!createdBy(name)', { count: 'exact' })
      .eq('gymId', gymId)
      .eq('is_deleted', false);

    if (filters?.category && filters.category !== 'all') {
      query = query.ilike('category', filters.category);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.ilike('paymentMethod', `%${filters.paymentMethod}%`);
    }

    if (filters?.dateFilter && filters.dateFilter !== 'all') {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');

      if (filters.dateFilter === 'today') {
        const todayStr = `${y}-${m}-${d}`;
        query = query.gte('date', todayStr).lte('date', `${todayStr}T23:59:59.999Z`);
      } else if (filters.dateFilter === 'this_month') {
        const firstDayOfMonth = `${y}-${m}-01`;
        const lastDayDate = new Date(y, now.getMonth() + 1, 0);
        const lastDayStr = `${y}-${m}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        query = query.gte('date', firstDayOfMonth).lte('date', `${lastDayStr}T23:59:59.999Z`);
      } else if (filters.dateFilter === 'last_month') {
        const lastMonthDate = new Date(y, now.getMonth() - 1, 1);
        const lmY = lastMonthDate.getFullYear();
        const lmM = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const lmFirstDay = `${lmY}-${lmM}-01`;
        const lmLastDayDate = new Date(lmY, lastMonthDate.getMonth() + 1, 0);
        const lmLastDay = `${lmY}-${lmM}-${String(lmLastDayDate.getDate()).padStart(2, '0')}`;
        query = query.gte('date', lmFirstDay).lte('date', `${lmLastDay}T23:59:59.999Z`);
      }
    }

    if (filters?.searchQuery?.trim()) {
      const s = filters.searchQuery.trim().replace(/[%_,()]/g, '');
      if (s) {
        query = query.or(`expenseTitle.ilike.%${s}%,category.ilike.%${s}%,notes.ilike.%${s}%`);
      }
    }

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[gymExpensesHelper] fetchGymExpensesPaginated error:', error);
      throw error;
    }

    return {
      success: true,
      data: (data || []) as GymExpenseAttributes[],
      total: count || 0,
    };
  } catch (error: any) {
    console.error('[gymExpensesHelper] fetchGymExpensesPaginated error:', error);
    return { success: false, data: [], total: 0, error: error.message };
  }
}

export async function fetchGymExpenses(gymId: string): Promise<GymExpenseAttributes[]> {
  const { data, error } = await supabase
    .from('gym_expenses')
    .select('*, createdBy_user:users!createdBy(name)')
    .eq('gymId', gymId)
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (error) {
    console.error('[gymExpensesHelper] fetchGymExpenses Error:', error);
    throw error;
  }

  return (data as GymExpenseAttributes[]) ?? [];
}

export async function fetchGymExpenseById(gymExpenseId: string): Promise<GymExpenseAttributes | null> {
  const { data, error } = await supabase
    .from('gym_expenses')
    .select('*, createdBy_user:users!createdBy(name)')
    .eq('gymExpenseId', gymExpenseId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    console.error('[gymExpensesHelper] fetchGymExpenseById Error:', error);
    throw error;
  }

  return data as GymExpenseAttributes | null;
}

export async function saveGymExpense(expenseData: SaveGymExpenseParams): Promise<GymExpenseAttributes | null> {
  const now = new Date().toISOString();

  if (expenseData.gymExpenseId) {
    const { data, error } = await supabase
      .from('gym_expenses')
      .update({
        expenseTitle: expenseData.expenseTitle,
        category: expenseData.category,
        amount: expenseData.amount,
        date: expenseData.date,
        paymentMethod: expenseData.paymentMethod,
        notes: expenseData.notes,
        receiptUrl: expenseData.receiptUrl,
        updatedAt: now,
      })
      .eq('gymExpenseId', expenseData.gymExpenseId)
      .select('*, createdBy_user:users!createdBy(name)');

    if (error) {
      console.error('[gymExpensesHelper] saveGymExpense Update Error:', error);
      throw error;
    }

    return data && data.length > 0 ? (data[0] as GymExpenseAttributes) : null;
  } else {
    const generatedId = Crypto.randomUUID();
    const { data, error } = await supabase
      .from('gym_expenses')
      .insert([
        {
          gymExpenseId: generatedId,
          expenseTitle: expenseData.expenseTitle,
          category: expenseData.category,
          amount: expenseData.amount,
          date: expenseData.date,
          paymentMethod: expenseData.paymentMethod,
          notes: expenseData.notes || null,
          receiptUrl: expenseData.receiptUrl || null,
          gymId: expenseData.gymId,
          createdBy: expenseData.createdBy,
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select('*, createdBy_user:users!createdBy(name)');

    if (error) {
      console.error('[gymExpensesHelper] saveGymExpense Insert Error:', error);
      throw error;
    }

    return data && data.length > 0 ? (data[0] as GymExpenseAttributes) : null;
  }
}

export async function deleteGymExpense(gymExpenseId: string): Promise<boolean> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('gym_expenses')
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq('gymExpenseId', gymExpenseId);

  if (error) {
    console.error('[gymExpensesHelper] deleteGymExpense Error:', error);
    throw error;
  }

  return true;
}

export async function uploadGymExpenseReceipt(uri: string, fileExtension: string = 'jpg'): Promise<string | null> {
  try {
    const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    let fileData: ArrayBuffer | Blob;

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      fileData = base64ToArrayBuffer(base64);
    }

    let contentType = 'image/jpeg';
    if (fileExtension.toLowerCase() === 'png') contentType = 'image/png';
    else if (fileExtension.toLowerCase() === 'pdf') contentType = 'application/pdf';
    else if (fileExtension.toLowerCase() === 'webp') contentType = 'image/webp';

    const { data, error } = await supabase.storage
      .from('gym-expenses')
      .upload(fileName, fileData, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[gymExpensesHelper] storage upload error:', error);
      throw error;
    }

    if (data) {
      const { data: publicData } = supabase.storage
        .from('gym-expenses')
        .getPublicUrl(fileName);
      return publicData?.publicUrl || fileName;
    }

    return null;
  } catch (error: any) {
    console.error('[gymExpensesHelper] uploadGymExpenseReceipt Error:', error);
    throw error;
  }
}

export async function deleteGymExpenseReceipt(fileNameOrUrl: string): Promise<boolean> {
  try {
    let fileName = fileNameOrUrl;
    if (fileNameOrUrl.includes('/')) {
      fileName = fileNameOrUrl.split('/').pop() || fileNameOrUrl;
    }
    const { error } = await supabase.storage.from('gym-expenses').remove([fileName]);
    if (error) {
      console.warn('[gymExpensesHelper] deleteGymExpenseReceipt error:', error);
    }
    return true;
  } catch (error) {
    console.error('[gymExpensesHelper] deleteGymExpenseReceipt Catch:', error);
    return false;
  }
}
