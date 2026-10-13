import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";

const getSupabase = () => supabase;

export type PlanForEnum = "gyms" | "customer";

export interface SubscriptionAttributes {
  subscriptionPlanId?: string;
  planName: string;
  label?: string | null;
  price?: number | null;
  planFor: PlanForEnum | string;
  createdBy: string;
  isActive?: boolean;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveSubscriptionParams {
  subscriptionPlanId?: string;
  planName: string;
  label?: string | null;
  price?: number | null;
  planFor: PlanForEnum | string;
  createdBy: string;
  isActive?: boolean;
}

export async function fetchSubscriptions(createdBy?: string, planFor?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from("subscriptions")
    .select(`
      *,
      subscription_features (
        subscriptionFeatureId,
        featureName,
        is_deleted
      )
    `)
    .eq("is_deleted", false)
    .order("createdAt", { ascending: false });

  if (createdBy) {
    query = query.eq("createdBy", createdBy);
  }

  if (planFor) {
    const validPlanFor: PlanForEnum =
      planFor === "customers" || planFor === "customer" || planFor === "individual_customer"
        ? "customer"
        : "gyms";
    query = query.eq("planFor", validPlanFor);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[subscriptionHelper] fetchSubscriptions Error:", error);
    throw error;
  }
  return data ?? [];
}

export async function fetchSubscriptionsPaginated(
  page: number = 1,
  limit: number = 10,
  searchQuery?: string,
  statusFilter?: string,
  createdBy?: string,
  sortOrder: "newest" | "oldest" = "newest"
) {
  const supabase = getSupabase();
  let query = supabase
    .from("subscriptions")
    .select("*", { count: "exact" })
    .eq("is_deleted", false);

  if (createdBy) query = query.eq("createdBy", createdBy);
  if (statusFilter && statusFilter !== "all") query = query.eq("isActive", statusFilter === "active");
  if (searchQuery) query = query.or(`planName.ilike.%${searchQuery}%,label.ilike.%${searchQuery}%`);

  query = query.order("createdAt", { ascending: sortOrder === "oldest" });
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("[subscriptionHelper] fetchSubscriptionsPaginated Error:", error);
    throw error;
  }
  return { data: data ?? [], total: count ?? 0 };
}

export async function fetchSubscriptionById(subscriptionPlanId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      subscription_features (
        subscriptionFeatureId,
        featureName,
        is_deleted
      )
    `)
    .eq("subscriptionPlanId", subscriptionPlanId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    console.error("[subscriptionHelper] fetchSubscriptionById Error:", error);
    throw error;
  }
  return data;
}

export async function saveSubscription(subscriptionData: SaveSubscriptionParams) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user && session.user.user_metadata?.role !== "superadmin") {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("userId", session.user.id)
      .maybeSingle();

    if (profile?.role === "superadmin") {
      await supabase.auth.updateUser({ data: { role: "superadmin" } });
    }
  }

  const validPlanFor: PlanForEnum =
    subscriptionData.planFor === "customers" ||
      subscriptionData.planFor === "customer" ||
      subscriptionData.planFor === "individual_customer"
      ? "customer"
      : "gyms";

  if (subscriptionData.subscriptionPlanId) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        planName: subscriptionData.planName,
        label: subscriptionData.label ? subscriptionData.label.trim() : null,
        price: subscriptionData.price,
        planFor: validPlanFor,
        isActive: subscriptionData.isActive ?? true,
        updatedAt: now,
      })
      .eq("subscriptionPlanId", subscriptionData.subscriptionPlanId)
      .select();

    if (error) {
      console.error("[subscriptionHelper] saveSubscription Update Error:", error);
      throw error;
    }
    return data ? data[0] : null;
  } else {
    const generatedSubscriptionPlanId =
      subscriptionData.subscriptionPlanId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          subscriptionPlanId: generatedSubscriptionPlanId,
          planName: subscriptionData.planName,
          label: subscriptionData.label ? subscriptionData.label.trim() : null,
          price: subscriptionData.price || null,
          planFor: validPlanFor,
          isActive: subscriptionData.isActive ?? true,
          is_deleted: false,
          createdBy: subscriptionData.createdBy,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error("[subscriptionHelper] saveSubscription Insert Error:", error);
      throw error;
    }
    return data ? data[0] : null;
  }
}

export async function deleteSubscription(subscriptionPlanId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      isActive: false,
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq("subscriptionPlanId", subscriptionPlanId)
    .select();

  if (error) {
    console.error("[subscriptionHelper] deleteSubscription Error:", error);
    throw error;
  }
  return data ? data[0] : null;
}

export async function toggleSubscriptionActiveStatus(
  subscriptionPlanId: string,
  currentStatus: boolean
) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      isActive: !currentStatus,
      updatedAt: now,
    })
    .eq("subscriptionPlanId", subscriptionPlanId)
    .select();

  if (error) {
    console.error("[subscriptionHelper] toggleSubscriptionActiveStatus Error:", error);
    throw error;
  }
  return data ? data[0] : null;
}
