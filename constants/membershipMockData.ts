export interface MembershipFeatureItem {
  id: string;
  title: string;
  subtitle: string;
  defaultChecked?: boolean;
}

export interface MembershipPlan {
  id: string;
  name: string;
  priceFormatted: string;
  priceNumeric: string;
  billingCycle: string;
  duration: string;
  membersCount: number;
  membersText: string;
  features: string[];
  additionalFeaturesCount?: number;
  twoColumnLayout?: boolean;
}

export interface DraftPlan {
  id: string;
  planNumberLabel: string;
  name: string;
  price: string;
  duration: string;
  selectedFeatureIds: string[];
  isExpanded?: boolean;
}

export const MOCK_SELECTABLE_FEATURES: MembershipFeatureItem[] = [
  {
    id: 'workout_plans',
    title: 'Workout Plans',
    subtitle: 'Personalized workout plans for members',
    defaultChecked: true,
  },
  {
    id: 'nutrition_plans',
    title: 'Nutrition Plans',
    subtitle: 'Personalized nutrition plans for members',
    defaultChecked: true,
  },
  {
    id: 'water_tracker',
    title: 'Water Tracker',
    subtitle: 'Track daily water intake and stay hydrated',
    defaultChecked: true,
  },
  {
    id: 'progress_tracking',
    title: 'Progress Tracking',
    subtitle: 'Track body progress and see your transformation',
    defaultChecked: true,
  },
  {
    id: 'attendance',
    title: 'Attendance',
    subtitle: 'Track gym attendance and workout history',
    defaultChecked: true,
  },
  {
    id: 'recipes',
    title: 'Recipes',
    subtitle: 'Access healthy recipes and meal ideas',
    defaultChecked: true,
  },
  {
    id: 'community',
    title: 'Community Access',
    subtitle: 'Connect and engage with the community',
    defaultChecked: true,
  },
  {
    id: 'ai_recommendations',
    title: 'AI Recommendations',
    subtitle: 'AI-powered workout and nutrition suggestions',
    defaultChecked: true,
  },
];

export const MOCK_OWNER_PLANS: MembershipPlan[] = [
  {
    id: 'basic',
    name: 'Basic Membership',
    priceFormatted: '₹799',
    priceNumeric: '799',
    billingCycle: '/ Month',
    duration: '1 Month',
    membersCount: 42,
    membersText: '42 Members',
    features: [
      'Workout Plans',
      'Attendance',
      'Water Tracker',
      'Community',
    ],
    additionalFeaturesCount: 2,
    twoColumnLayout: false,
  },
  {
    id: 'premium',
    name: 'Premium Membership',
    priceFormatted: '₹1,299',
    priceNumeric: '1299',
    billingCycle: '/ Month',
    duration: '3 Months',
    membersCount: 138,
    membersText: '138 Members',
    features: [
      'Workout Plans',
      'Recipes',
      'Nutrition Plans',
      'Community',
      'Progress Tracking',
      'AI Recommendation',
      'Water Tracker',
    ],
    additionalFeaturesCount: 1,
    twoColumnLayout: true,
  },
  {
    id: 'elite',
    name: 'Elite Membership',
    priceFormatted: '₹2,499',
    priceNumeric: '2499',
    billingCycle: '/ Month',
    duration: '6 Months',
    membersCount: 0,
    membersText: '0 Members',
    features: [
      'All Premium Features',
      'Priority Support',
      'Early Access to New Features',
    ],
    twoColumnLayout: false,
  },
];

export const MOCK_DRAFT_PLANS: DraftPlan[] = [
  {
    id: 'plan-1',
    planNumberLabel: 'PLAN 1',
    name: 'Basic Membership',
    price: '799',
    duration: '1 Month',
    selectedFeatureIds: [
      'workout_plans',
      'nutrition_plans',
      'water_tracker',
      'progress_tracking',
      'attendance',
      'recipes',
      'community',
      'ai_recommendations',
    ],
    isExpanded: true,
  },
  {
    id: 'plan-2',
    planNumberLabel: 'PLAN 2',
    name: 'Premium Membership',
    price: '1299',
    duration: '3 Months',
    selectedFeatureIds: [
      'workout_plans',
      'nutrition_plans',
      'water_tracker',
      'progress_tracking',
      'attendance',
      'recipes',
      'community',
      'ai_recommendations',
    ],
    isExpanded: false,
  },
  {
    id: 'plan-3',
    planNumberLabel: 'PLAN 3',
    name: 'Elite Membership',
    price: '2499',
    duration: '6 Months',
    selectedFeatureIds: [
      'workout_plans',
      'nutrition_plans',
      'water_tracker',
      'progress_tracking',
      'attendance',
      'recipes',
      'community',
      'ai_recommendations',
    ],
    isExpanded: false,
  },
];
