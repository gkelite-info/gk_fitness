import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';

export interface IndividualCustomerPlanAttributes {
    individualCustomerPlanId?: string;
    subscriptionPlanId: string;
    userId?: string | null;
    customAmount?: number | null;
    startDate: string | Date;
    endDate: string | Date;
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

export async function fetchIndividualCustomerPlans(userId?: string, subscriptionPlanId?: string) {
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

    let finalStartDate = planData.startDate ? new Date(planData.startDate).toISOString() : null;
    let finalEndDate = planData.endDate ? new Date(planData.endDate).toISOString() : null;

    if (!finalStartDate || !finalEndDate) {
        const nowDate = new Date();
        finalStartDate = nowDate.toISOString();

        const calculatedEnd = new Date(nowDate);
        const targetDay = nowDate.getDate();
        calculatedEnd.setMonth(calculatedEnd.getMonth() + 1);
        if (calculatedEnd.getDate() !== targetDay) {
            calculatedEnd.setDate(0);
        }
        finalEndDate = calculatedEnd.toISOString();
    }

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
        const { data, error } = await supabase
            .from('individual_customer_plans')
            .update({
                subscriptionPlanId: planData.subscriptionPlanId,
                userId: planData.userId || null,
                customAmount: finalAmount ?? null,
                startDate: finalStartDate,
                endDate: finalEndDate,
                isActive: finalIsActive,
                updatedAt: now,
            })
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
