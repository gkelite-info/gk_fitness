import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  MembershipPlan, 
  DraftPlan, 
  MOCK_OWNER_PLANS, 
  MOCK_SELECTABLE_FEATURES 
} from '@/constants/membershipMockData';

interface MembershipContextType {
  plans: MembershipPlan[];
  drafts: DraftPlan[];
  isEditingExisting: boolean;
  setDrafts: React.Dispatch<React.SetStateAction<DraftPlan[]>>;
  startCreateFlow: () => void;
  startEditFlow: (plan: MembershipPlan) => void;
  publishPlans: (finalDrafts: DraftPlan[]) => void;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<MembershipPlan[]>(MOCK_OWNER_PLANS);
  const [drafts, setDrafts] = useState<DraftPlan[]>([]);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);

  const startCreateFlow = () => {
    setIsEditingExisting(false);
    // Initialize with one default customizable draft plan
    const newPlanId = `plan-${Date.now()}`;
    setDrafts([{
      id: newPlanId,
      planNumberLabel: 'PLAN 1',
      name: 'Standard Membership',
      price: '999',
      duration: '1 Month',
      selectedFeatureIds: MOCK_SELECTABLE_FEATURES.map(f => f.id),
      isExpanded: true,
    }]);
  };

  const startEditFlow = (plan: MembershipPlan) => {
    setIsEditingExisting(true);
    // Map existing plan features back to feature IDs for interactive toggling
    const mappedIds = MOCK_SELECTABLE_FEATURES
      .filter(f => plan.features.some(feat => 
        f.title.toLowerCase().includes(feat.toLowerCase()) || 
        feat.toLowerCase().includes(f.title.toLowerCase()) ||
        (feat.includes('All Premium') && f.id !== 'ai_recommendations')
      ))
      .map(f => f.id);
    
    // If no explicit match, default to checked standard features
    const activeFeatureIds = mappedIds.length > 0 ? mappedIds : MOCK_SELECTABLE_FEATURES.slice(0, 5).map(f => f.id);

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

  const publishPlans = (finalDrafts: DraftPlan[]) => {
    setPlans(prevPlans => {
      let updatedPlans = [...prevPlans];
      
      finalDrafts.forEach(draft => {
        const mappedFeatures = MOCK_SELECTABLE_FEATURES
          .filter(f => draft.selectedFeatureIds.includes(f.id))
          .map(f => f.title);

        const priceNum = draft.price || '0';
        const formattedPrice = priceNum.startsWith('₹') ? priceNum : `₹${priceNum}`;

        const nextPlanObject: MembershipPlan = {
          id: draft.id,
          name: draft.name || 'Membership Plan',
          priceFormatted: formattedPrice,
          priceNumeric: priceNum.replace(/[^0-9]/g, ''),
          billingCycle: draft.duration.toLowerCase().includes('year') ? '/ Year' : '/ Month',
          duration: draft.duration || '1 Month',
          membersCount: 0,
          membersText: '0 Members',
          features: mappedFeatures.length > 0 ? mappedFeatures : ['Standard Gym Access', 'Attendance'],
          twoColumnLayout: mappedFeatures.length >= 6,
        };

        const existingIndex = updatedPlans.findIndex(p => p.id === draft.id);
        if (existingIndex !== -1) {
          // Keep existing members count and update details in place
          nextPlanObject.membersCount = updatedPlans[existingIndex].membersCount;
          nextPlanObject.membersText = updatedPlans[existingIndex].membersText;
          updatedPlans[existingIndex] = nextPlanObject;
        } else {
          // Append newly created membership plan to the live list
          updatedPlans.push(nextPlanObject);
        }
      });

      return updatedPlans;
    });
  };

  return (
    <MembershipContext.Provider value={{
      plans,
      drafts,
      isEditingExisting,
      setDrafts,
      startCreateFlow,
      startEditFlow,
      publishPlans,
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
