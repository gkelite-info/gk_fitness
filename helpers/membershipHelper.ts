import { supabase } from '@/lib/supabase';
import { MembershipPlan, DraftPlan, MembershipFeatureItem, MOCK_SELECTABLE_FEATURES } from '@/constants/membershipMockData';
import * as Crypto from 'expo-crypto';

export async function fetchFeatures(): Promise<MembershipFeatureItem[]> {
  const { data, error } = await supabase
    .from('features')
    .select('featureId, featureName, description, is_Active')
    .eq('is_Active', true)
    .eq('is_deleted', false);

  if (error) {
    console.error('Error fetching features:', error);
    return [];
  }

  if (!data || data.length === 0) {
    const seedData = MOCK_SELECTABLE_FEATURES.map(f => ({
      featureId: Crypto.randomUUID(),
      featureName: f.title,
      description: f.subtitle,
      is_Active: true,
      is_deleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const { error: seedError } = await supabase.from('features').insert(seedData);
    if (!seedError) {
      return fetchFeatures();
    } else {
      console.error('Error seeding features:', seedError);
    }
  }

  return (data || []).map(f => ({
    id: f.featureId,
    title: f.featureName,
    subtitle: f.description || '',
    defaultChecked: false
  }));
}

export async function fetchGymMembershipPlans(gymId: string): Promise<MembershipPlan[]> {
  const { data: plansData, error: plansError } = await supabase
    .from('gym_membership_plans')
    .select(`
      planId, planName, price, durationMonths,
      gym_membership_plan_features (
        featureId,
        features ( featureName )
      )
    `)
    .eq('gymId', gymId)
    .eq('is_Active', true)
    .eq('is_deleted', false)
    .order('createdAt', { ascending: true });

  if (plansError) {
    console.error('Error fetching plans:', plansError);
    return [];
  }

  return (plansData || []).map(plan => {
    const features = plan.gym_membership_plan_features
      ?.map((mapping: any) => mapping.features?.featureName)
      .filter(Boolean) || [];

    const durationMonths = plan.durationMonths || 1;
    const durationString = durationMonths === 1 ? '1 Month' : durationMonths === 12 ? '1 Year' : `${durationMonths} Months`;
    const billingCycle = durationMonths >= 12 ? '/ Year' : '/ Month';
    
    return {
      id: plan.planId,
      name: plan.planName,
      priceFormatted: `₹${plan.price}`,
      priceNumeric: plan.price.toString(),
      billingCycle: billingCycle,
      duration: durationString,
      membersCount: 0,
      membersText: '0 Members',
      features: features.length > 0 ? features : ['Standard Gym Access'],
      twoColumnLayout: features.length >= 6
    };
  });
}

export async function upsertMembershipPlans(gymId: string, createdBy: string, drafts: DraftPlan[]) {
  for (const draft of drafts) {
    const isNew = draft.id.startsWith('plan-');
    let planId = draft.id;
    const priceNum = parseInt(draft.price || '0', 10);
    
    let durationMonths = 1;
    if (draft.duration.toLowerCase().includes('year')) {
      durationMonths = 12;
    } else {
      const match = draft.duration.match(/\d+/);
      if (match) durationMonths = parseInt(match[0], 10);
    }

    if (isNew) {
      const newPlanId = Crypto.randomUUID();
      const { data: newPlan, error: insertError } = await supabase
        .from('gym_membership_plans')
        .insert({
          planId: newPlanId,
          gymId: gymId,
          planName: draft.name,
          price: priceNum,
          durationMonths: durationMonths,
          createdBy: createdBy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('planId')
        .single();
        
      if (insertError || !newPlan) {
        console.error('Error inserting plan:', insertError);
        continue;
      }
      planId = newPlan.planId;
    } else {
      const { error: updateError } = await supabase
        .from('gym_membership_plans')
        .update({
          planName: draft.name,
          price: priceNum,
          durationMonths: durationMonths,
          updatedAt: new Date().toISOString()
        })
        .eq('planId', planId);
        
      if (updateError) {
        console.error('Error updating plan:', updateError);
        continue;
      }
      
      await supabase
        .from('gym_membership_plan_features')
        .delete()
        .eq('planId', planId);
    }
    
    if (draft.selectedFeatureIds && draft.selectedFeatureIds.length > 0) {
      const featureMappings = draft.selectedFeatureIds.map(fid => ({
        planFeatureId: Crypto.randomUUID(),
        planId: planId,
        featureId: fid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      const { error: featureError } = await supabase
        .from('gym_membership_plan_features')
        .insert(featureMappings);
        
      if (featureError) {
        console.error('Error inserting features:', featureError);
      }
    }
  }
}

export async function deleteMembershipPlan(planId: string) {
  const { error } = await supabase
    .from('gym_membership_plans')
    .update({ 
      is_deleted: true, 
      is_Active: false, 
      deletedAt: new Date().toISOString() 
    })
    .eq('planId', planId);
    
  if (error) {
    console.error('Error deleting plan:', error);
  }
}
