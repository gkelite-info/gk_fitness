import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface IndividualCustomerPlanAttributes {
    individualCustomerPlanId?: string;
    subscriptionPlanId: string;
    userId?: string | null;
    customAmount?: number | null;
    status?: string | null;
    transactionId?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    isActive?: boolean;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    deletedAt?: string | Date | null;

    subscription?: {
        subscriptionPlanId: string;
        planName: string;
        label?: string | null;
        price?: number | null;
        planFor?: string | null;
        subscription_features?: Array<{
            subscriptionFeatureId: string;
            featureName: string;
            is_deleted?: boolean;
        }>;
    } | null;

    user?: {
        userId: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        profilePhoto?: string | null;
        status?: string | null;
        createdAt?: string | null;
    } | null;
}

export interface SaveIndividualCustomerPlanParams {
    individualCustomerPlanId?: string;
    subscriptionPlanId: string;
    userId?: string | null;
    customAmount?: number | null;
    status?: string | null;
    transactionId?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    isActive?: boolean;
}

const BASE_PLAN_SELECT = `
  *,
  subscription:subscriptions (
    subscriptionPlanId,
    planName,
    label,
    price,
    planFor,
    subscription_features (
      subscriptionFeatureId,
      featureName,
      is_deleted
    )
  ),
  user:users (
    userId,
    name,
    email,
    phone,
    profilePhoto,
    status,
    createdAt
  )
`;

export async function fetchIndividualCustomerPlans(userId?: string | null, subscriptionPlanId?: string) {
    let query = supabase
        .from('individual_customer_plans')
        .select(BASE_PLAN_SELECT)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(50);

    if (userId) {
        query = query.eq('userId', userId);
    }

    if (subscriptionPlanId) {
        query = query.eq('subscriptionPlanId', subscriptionPlanId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[individualCustomerPlanHelper] fetchIndividualCustomerPlans Error:', error);
        throw error;
    }

    return (data as IndividualCustomerPlanAttributes[]) ?? [];
}

export async function fetchIndividualCustomerPlanById(id: string) {
    const { data, error } = await supabase
        .from('individual_customer_plans')
        .select(BASE_PLAN_SELECT)
        .eq('individualCustomerPlanId', id)
        .is('deletedAt', null)
        .maybeSingle();

    if (error) {
        console.error('[individualCustomerPlanHelper] fetchIndividualCustomerPlanById Error:', error);
        throw error;
    }

    return (data as IndividualCustomerPlanAttributes) ?? null;
}

export async function fetchActiveIndividualCustomerPlan(userId: string) {
    const { data, error } = await supabase
        .from('individual_customer_plans')
        .select(BASE_PLAN_SELECT)
        .eq('userId', userId)
        .eq('isActive', true)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[individualCustomerPlanHelper] fetchActiveIndividualCustomerPlan Error:', error);
        throw error;
    }

    return (data as IndividualCustomerPlanAttributes) ?? null;
}

export async function saveIndividualCustomerPlan(planData: SaveIndividualCustomerPlanParams) {
    const now = new Date().toISOString();

    let targetPlanId = planData.individualCustomerPlanId;
    let isUpdate = false;

    if (targetPlanId) {
        const { data } = await supabase
            .from('individual_customer_plans')
            .select('*')
            .eq('individualCustomerPlanId', targetPlanId)
            .is('deletedAt', null)
            .maybeSingle();

        if (data) {
            isUpdate = true;
        }
    }

    if (!isUpdate && planData.userId) {
        const { data } = await supabase
            .from('individual_customer_plans')
            .select('*')
            .eq('userId', planData.userId)
            .is('deletedAt', null)
            .order('createdAt', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (data) {
            targetPlanId = data.individualCustomerPlanId;
            isUpdate = true;
        }
    }

    const finalStartDate = planData.startDate ? new Date(planData.startDate).toISOString() : null;
    const finalEndDate = planData.endDate ? new Date(planData.endDate).toISOString() : null;

    let finalAmount = planData.customAmount;
    if (finalAmount === undefined || finalAmount === null) {
        if (planData.subscriptionPlanId) {
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('price')
                .eq('subscriptionPlanId', planData.subscriptionPlanId)
                .maybeSingle();

            if (subData?.price !== undefined && subData?.price !== null) {
                finalAmount = Number(subData.price);
            }
        }
    }

    const finalIsActive = planData.isActive !== undefined ? planData.isActive : true;

    if (isUpdate && targetPlanId) {
        const updatePayload: Record<string, any> = {
            subscriptionPlanId: planData.subscriptionPlanId,
            userId: planData.userId || null,
            customAmount: finalAmount ?? null,
            isActive: finalIsActive,
            updatedAt: now,
        };

        if (planData.startDate !== undefined) {
            updatePayload.startDate = finalStartDate;
        }
        if (planData.endDate !== undefined) {
            updatePayload.endDate = finalEndDate;
        }
        if (planData.status !== undefined) {
            updatePayload.status = planData.status;
        }
        if (planData.transactionId !== undefined) {
            updatePayload.transactionId = planData.transactionId;
        }

        const { data, error } = await supabase
            .from('individual_customer_plans')
            .update(updatePayload)
            .eq('individualCustomerPlanId', targetPlanId)
            .select(BASE_PLAN_SELECT);

        if (error) {
            console.error('[individualCustomerPlanHelper] saveIndividualCustomerPlan update Error:', error);
            throw error;
        }

        return (data ? data[0] : null) as IndividualCustomerPlanAttributes | null;
    } else {
        const generatedId = targetPlanId || Crypto.randomUUID();
        const insertPayload = {
            individualCustomerPlanId: generatedId,
            subscriptionPlanId: planData.subscriptionPlanId,
            userId: planData.userId || null,
            customAmount: finalAmount ?? null,
            startDate: finalStartDate,
            endDate: finalEndDate,
            isActive: finalIsActive,
            status: planData.status ?? 'pending',
            transactionId: planData.transactionId ?? null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };

        const { data, error } = await supabase
            .from('individual_customer_plans')
            .insert([insertPayload])
            .select(BASE_PLAN_SELECT);

        if (error) {
            console.error('[individualCustomerPlanHelper] saveIndividualCustomerPlan insert Error:', error);
            throw error;
        }

        return (data ? data[0] : null) as IndividualCustomerPlanAttributes | null;
    }
}

export async function deleteIndividualCustomerPlan(id: string) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('individual_customer_plans')
        .update({
            isActive: false,
            deletedAt: now,
            updatedAt: now,
        })
        .eq('individualCustomerPlanId', id)
        .select();

    if (error) {
        console.error('[individualCustomerPlanHelper] deleteIndividualCustomerPlan Error:', error);
        throw error;
    }

    return (data ? data[0] : null) as IndividualCustomerPlanAttributes | null;
}

export async function toggleIndividualCustomerPlanActiveStatus(id: string, currentStatus: boolean) {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('individual_customer_plans')
        .update({
            isActive: !currentStatus,
            updatedAt: now,
        })
        .eq('individualCustomerPlanId', id)
        .select();

    if (error) {
        console.error('[individualCustomerPlanHelper] toggleIndividualCustomerPlanActiveStatus Error:', error);
        throw error;
    }

    return (data ? data[0] : null) as IndividualCustomerPlanAttributes | null;
}

export async function fetchIndividualCustomerPlansPaginated(
    page: number = 1,
    limit: number = 10,
    searchQuery?: string,
    sortOrder: 'newest' | 'oldest' = 'newest',
    subscriptionPlanId?: string,
    isActive?: boolean
) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('individual_customer_plans')
        .select(
            `
      *,
      user:users (
        userId,
        name,
        email,
        phone,
        profilePhoto,
        status,
        createdAt
      ),
      subscription:subscriptions (
        subscriptionPlanId,
        planName,
        label,
        price,
        planFor
      )
    `,
            { count: 'exact' }
        )
        .is('deletedAt', null)
        .order('createdAt', { ascending: sortOrder === 'oldest' });

    if (searchQuery) {
        query = query.ilike('user.name', `%${searchQuery}%`);
    }

    if (subscriptionPlanId) {
        query = query.eq('subscriptionPlanId', subscriptionPlanId);
    }

    if (isActive !== undefined) {
        query = query.eq('isActive', isActive);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
        console.error('[individualCustomerPlanHelper] fetchIndividualCustomerPlansPaginated Error:', error);
        throw error;
    }

    return {
        data: (data as IndividualCustomerPlanAttributes[]) ?? [],
        total: count ?? 0,
    };
}


/**
 * Assigns an initial pending individual customer plan upon registration with null startDate and endDate.
 */
export async function assignInitialIndividualCustomerPlan(
  userId: string,
  subscriptionPlanId?: string,
  customAmount?: number | null
): Promise<IndividualCustomerPlanAttributes | null> {
  try {
    let subPlanId = subscriptionPlanId;
    let amount = customAmount;

    if (!subPlanId) {
      const { data: defaultSub } = await supabase
        .from('subscriptions')
        .select('subscriptionPlanId, price')
        .eq('planFor', 'customer')
        .eq('isActive', true)
        .eq('is_deleted', false)
        .order('createdAt', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultSub) {
        subPlanId = defaultSub.subscriptionPlanId;
        if (amount === undefined || amount === null) {
          amount = defaultSub.price ? Number(defaultSub.price) : 0;
        }
      }
    }

    if (!subPlanId) {
      console.warn('[individualCustomerPlanHelper] No customer subscription plan available to assign for user:', userId);
      return null;
    }

    // Check if user already has a plan assigned
    const existingPlan = await fetchActiveIndividualCustomerPlan(userId);
    if (existingPlan) {
      if (subPlanId && existingPlan.subscriptionPlanId !== subPlanId && existingPlan.status === 'pending') {
        const updatedPlan = await saveIndividualCustomerPlan({
          individualCustomerPlanId: existingPlan.individualCustomerPlanId,
          subscriptionPlanId: subPlanId,
          userId,
          customAmount: amount ?? 0,
          startDate: null,
          endDate: null,
          isActive: true,
          status: 'pending',
          transactionId: null,
        });

        if (updatedPlan?.individualCustomerPlanId) {
          try {
            await supabase.from('individual_customer_plan_histories').insert([{
              individualCustomerPlanHistoryId: Crypto.randomUUID(),
              individualCustomerPlanId: updatedPlan.individualCustomerPlanId,
              subscriptionPlanId: subPlanId,
              userId,
              actionType: 'ASSIGNED',
              customAmount: amount ?? 0,
              unusedCredit: 0,
              daysCarriedOver: 0,
              startDate: null,
              endDate: null,
              paymentStatus: 'pending',
              transactionId: null,
              isActive: true,
              is_deleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }]);
          } catch (histErr) {
            console.warn('[individualCustomerPlanHelper] Error logging updated history:', histErr);
          }
        }
        return updatedPlan;
      }
      return existingPlan;
    }

    // Save with startDate and endDate set to null
    const newPlan = await saveIndividualCustomerPlan({
      subscriptionPlanId: subPlanId,
      userId,
      customAmount: amount ?? 0,
      startDate: null,
      endDate: null,
      isActive: true,
      status: 'pending',
      transactionId: null,
    });

    if (newPlan?.individualCustomerPlanId) {
      try {
        await supabase.from('individual_customer_plan_histories').insert([{
          individualCustomerPlanHistoryId: Crypto.randomUUID(),
          individualCustomerPlanId: newPlan.individualCustomerPlanId,
          subscriptionPlanId: subPlanId,
          userId,
          actionType: 'ASSIGNED',
          customAmount: amount ?? 0,
          unusedCredit: 0,
          daysCarriedOver: 0,
          startDate: null,
          endDate: null,
          paymentStatus: 'pending',
          transactionId: null,
          isActive: true,
          is_deleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]);
      } catch (histErr) {
        console.warn('[individualCustomerPlanHelper] Error logging assigned history:', histErr);
      }
    }

    return newPlan;
  } catch (err) {
    console.error('[individualCustomerPlanHelper] assignInitialIndividualCustomerPlan Error:', err);
    return null;
  }
}
