import { supabase } from "@/lib/supabase";
import * as Crypto from "expo-crypto";

const getSupabase = () => supabase;

export interface SubscriptionFeatureAttributes {
  subscriptionFeatureId?: string;
  subscriptionPlanId: string;
  featureName: string;
  is_deleted?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  deletedAt?: string | Date | null;
}

export interface SaveSubscriptionFeatureParams {
  subscriptionFeatureId?: string;
  subscriptionPlanId: string;
  featureName: string;
}

export async function fetchSubscriptionFeatures(subscriptionPlanId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscription_features")
    .select("*")
    .eq("subscriptionPlanId", subscriptionPlanId)
    .eq("is_deleted", false)
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("[subscriptionFeatureHelper] fetchSubscriptionFeatures Error:", error);
    throw error;
  }
  return data ?? [];
}

export async function fetchSubscriptionFeatureById(subscriptionFeatureId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("subscription_features")
    .select("*")
    .eq("subscriptionFeatureId", subscriptionFeatureId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    console.error("[subscriptionFeatureHelper] fetchSubscriptionFeatureById Error:", error);
    throw error;
  }
  return data;
}

export async function saveSubscriptionFeature(featureData: SaveSubscriptionFeatureParams) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (featureData.subscriptionFeatureId) {
    const { data, error } = await supabase
      .from("subscription_features")
      .update({
        featureName: featureData.featureName.trim(),
        updatedAt: now,
      })
      .eq("subscriptionFeatureId", featureData.subscriptionFeatureId)
      .select();

    if (error) {
      console.error("[subscriptionFeatureHelper] saveSubscriptionFeature Update Error:", error);
      throw error;
    }
    return data ? data[0] : null;
  } else {
    const generatedFeatureId = featureData.subscriptionFeatureId || Crypto.randomUUID();
    const { data, error } = await supabase
      .from("subscription_features")
      .insert([
        {
          subscriptionFeatureId: generatedFeatureId,
          subscriptionPlanId: featureData.subscriptionPlanId,
          featureName: featureData.featureName.trim(),
          is_deleted: false,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select();

    if (error) {
      console.error("[subscriptionFeatureHelper] saveSubscriptionFeature Insert Error:", error);
      throw error;
    }
    return data ? data[0] : null;
  }
}

export async function deleteSubscriptionFeature(subscriptionFeatureId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscription_features")
    .update({
      is_deleted: true,
      deletedAt: now,
      updatedAt: now,
    })
    .eq("subscriptionFeatureId", subscriptionFeatureId)
    .select();

  if (error) {
    console.error("[subscriptionFeatureHelper] deleteSubscriptionFeature Error:", error);
    throw error;
  }
  return data ? data[0] : null;
}
