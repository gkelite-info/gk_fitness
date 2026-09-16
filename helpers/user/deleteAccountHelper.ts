import { supabase } from '@/lib/supabase';

export async function deleteCustomerAccount(userId: string) {
  try {
    const { error } = await supabase.rpc('delete_customer_account', { p_user_id: userId });
    
    if (error) {
      throw error;
    }
    
    // Sign out after successful deletion
    await supabase.auth.signOut();
    
    return { success: true };
  } catch (err: any) {
    console.error('[deleteAccountHelper] Error deleting account:', err);
    throw new Error(err?.message || 'Failed to delete account');
  }
}
