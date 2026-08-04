import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MembershipPlan, DraftPlan, MembershipFeatureItem } from '@/constants/membershipMockData';
import { useUser } from '@/context/UserContext';
import { getOwnerGymId } from '@/helpers/trainers/trainerHelper';
import { fetchFeatures, fetchGymMembershipPlans, upsertMembershipPlans, deleteMembershipPlan } from '@/helpers/membershipHelper';

interface MembershipContextType {
  plans: MembershipPlan[];
  drafts: DraftPlan[];
  availableFeatures: MembershipFeatureItem[];
  isEditingExisting: boolean;
  isLoading: boolean;
  setDrafts: React.Dispatch<React.SetStateAction<DraftPlan[]>>;
  startCreateFlow: () => void;
  startEditFlow: (plan: MembershipPlan) => void;
  publishPlans: (finalDrafts: DraftPlan[]) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  refreshPlans: () => Promise<void>;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [drafts, setDrafts] = useState<DraftPlan[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<MembershipFeatureItem[]>([]);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gymId, setGymId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const gId = await getOwnerGymId(userId);
      setGymId(gId);
      
      if (gId) {
        const [fetchedFeatures, fetchedPlans] = await Promise.all([
          fetchFeatures(),
          fetchGymMembershipPlans(gId)
        ]);
        setAvailableFeatures(fetchedFeatures);
        setPlans(fetchedPlans);
      }
    } catch (error) {
      console.error("Failed to load membership data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startCreateFlow = () => {
    setIsEditingExisting(false);
    const newPlanId = `plan-${Date.now()}`;
    const defaultFeatureIds = availableFeatures.slice(0, 4).map(f => f.id);
    setDrafts([{
      id: newPlanId,
      planNumberLabel: 'PLAN 1',
      name: 'Standard Membership',
      price: '999',
      duration: '1 Month',
      selectedFeatureIds: defaultFeatureIds,
      isExpanded: true,
    }]);
  };

  const startEditFlow = (plan: MembershipPlan) => {
    setIsEditingExisting(true);
    const mappedIds = availableFeatures
      .filter(f => plan.features.some(feat => 
        f.title.toLowerCase().includes(feat.toLowerCase()) || 
        feat.toLowerCase().includes(f.title.toLowerCase())
      ))
      .map(f => f.id);
    
    const activeFeatureIds = mappedIds.length > 0 ? mappedIds : availableFeatures.slice(0, 5).map(f => f.id);

    setDrafts([{
      id: plan.id,
      planNumberLabel: 'EDIT PLAN',
      name: plan.name,
      price: plan.priceNumeric || plan.priceFormatted.replace(/[^0-9]/g, ''),
      duration: plan.duration,
      selectedFeatureIds: activeFeatureIds,
      isExpanded: true,
    }]);
  };

  const publishPlans = async (finalDrafts: DraftPlan[]) => {
    if (!gymId || !userId) return;
    setIsLoading(true);
    try {
      await upsertMembershipPlans(gymId, userId, finalDrafts);
      await loadData();
    } catch (error) {
      console.error("Failed to publish plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    setIsLoading(true);
    try {
      await deleteMembershipPlan(planId);
      await loadData();
    } catch (error) {
      console.error("Failed to delete plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MembershipContext.Provider value={{
      plans,
      drafts,
      availableFeatures,
      isEditingExisting,
      isLoading,
      setDrafts,
      startCreateFlow,
      startEditFlow,
      publishPlans,
      deletePlan,
      refreshPlans: loadData,
    }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembership() {
  const context = useContext(MembershipContext);
  if (!context) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
}
