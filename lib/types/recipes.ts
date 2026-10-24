export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface RecipeIngredient {
  id?: string;
  globalIngredientId?: string;
  name: string;
  quantity: number;
  unit: string;
  caloriesPerUnit?: number;
  proteinPerUnit?: number;
  carbsPerUnit?: number;
  fatPerUnit?: number;
}

export interface RecipeInstructionStep {
  step: number;
  text: string;
}

export interface GlobalMeal {
  globalMealId: string;
  mealType: MealType | string;
  mealName: string;
  description: string;
  calories?: number;
  baseCalories: number;
  protein?: number;
  baseProtein: number;
  carbs?: number;
  baseCarbs: number;
  fat?: number;
  baseFat: number;
  fiber?: number;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings?: number;
  servingUnit?: string;
  difficulty?: DifficultyLevel | string;
  sodiumMg?: number;
  sugarG?: number;
  isScalable: boolean;
  minScale: number;
  maxScale: number;
  dietTypes: string[];
  allergens: string[];
  cuisines: string[];
  suitableFor?: string[];
  contraindications?: string[];
  recipeInstructions: RecipeInstructionStep[] | any;
  imageUrl: string;
  gymId?: string | null;
  isActive?: boolean;
  isGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  ingredients?: RecipeIngredient[];
}

export interface CreateRecipeInput {
  mealName: string;
  mealType: MealType | string;
  description: string;
  calories: number;
  baseCalories?: number;
  protein: number;
  baseProtein?: number;
  carbs: number;
  baseCarbs?: number;
  fat: number;
  baseFat?: number;
  fiber?: number;
  prepTimeMinutes: number;
  cookTimeMinutes?: number;
  servings?: number;
  servingUnit?: string;
  difficulty?: DifficultyLevel | string;
  sodiumMg?: number;
  sugarG?: number;
  isScalable?: boolean;
  minScale?: number;
  maxScale?: number;
  dietTypes: string[];
  allergens: string[];
  cuisines: string[];
  suitableFor?: string[];
  contraindications?: string[];
  recipeInstructions: RecipeInstructionStep[];
  imageUrl?: string | null;
  ingredients?: RecipeIngredient[];
  isActive?: boolean;
  isGlobal?: boolean;
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  globalMealId: string;
}

export const MEAL_TYPES: { value: MealType; label: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', color: '#FBBF24' },
  { value: 'lunch', label: 'Lunch', color: '#38BDF8' },
  { value: 'snack', label: 'Snack', color: '#FB923C' },
  { value: 'dinner', label: 'Dinner', color: '#A78BFA' },
];

export const DIET_TYPES = [
  'Vegetarian',
  'Vegan',
  'Non-Vegetarian',
  'Eggetarian',
  'Keto',
  'Low Carb',
  'High Protein',
];

export const ALLERGENS = [
  'Dairy',
  'Gluten',
  'Wheat',
  'Egg',
  'Fish',
  'Tree Nuts',
  'Peanuts',
  'Soy',
  'Shellfish',
  'None',
];

export const CUISINES = [
  'Indian',
  'Continental',
  'Mediterranean',
  'Asian',
  'Mexican',
  'Western',
  'Middle-Eastern',
  'Healthy',
];

export const CLINICAL_CONDITIONS = [
  'Type 2 Diabetes',
  'Prediabetes / Insulin Resistance',
  'Hypertension (High Blood Pressure)',
  'High Cholesterol / Dyslipidemia',
  'Thyroid Disorder (Hypo / Hyper)',
  'PCOS / PCOD',
  'Cardiovascular / Heart Disease',
  'Chronic Kidney Disease (CKD)',
  'Celiac Disease (Gluten Intolerance)',
  'Fatty Liver Disease (NAFLD)',
  'Acid Reflux / GERD',
  'IBS / Inflammatory Bowel Disease',
  'Gout / High Uric Acid',
  'Osteopenia / Osteoporosis',
  'Lactose Intolerance',
];

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];

export const COMMON_UNITS = ['g', 'ml', 'tbsp', 'tsp', 'cup', 'piece', 'scoop', 'slice', 'bowl'];
