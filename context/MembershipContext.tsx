import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MembershipPlan, DraftPlan, MembershipFeatureItem } from '@/constants/membershipMockData';

interface MembershipContextType {
  drafts: DraftPlan[];
  isEditingExisting: boolean;
  setDrafts: React.Dispatch<React.SetStateAction<DraftPlan[]>>;
  startCreateFlow: (availableFeatures: MembershipFeatureItem[]) => void;
  startEditFlow: (plan: MembershipPlan, availableFeatures: MembershipFeatureItem[]) => void;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<DraftPlan[]>([]);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  const startCreateFlow = (availableFeatures: MembershipFeatureItem[]) => {
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

  const startEditFlow = (plan: MembershipPlan, availableFeatures: MembershipFeatureItem[]) => {
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

  return (
    <MembershipContext.Provider value={{
      drafts,
      isEditingExisting,
      setDrafts,
      startCreateFlow,
      startEditFlow,
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

