-- Migration: Add clinical medical suitability and contraindication tags to global_meals
-- Run this in Supabase SQL Editor

ALTER TABLE global_meals
  ADD COLUMN IF NOT EXISTS "suitableFor" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "contraindications" text[] DEFAULT '{}';

COMMENT ON COLUMN global_meals."suitableFor" IS 'List of standardized medical conditions where this recipe is clinically suitable or recommended (e.g. Type 2 Diabetes, Hypertension, PCOS / PCOD)';
COMMENT ON COLUMN global_meals."contraindications" IS 'List of standardized medical conditions where this recipe is contraindicated or prohibited (e.g. Gout, CKD, Diabetes)';

-- High-performance GIN indexes for array membership queries
CREATE INDEX IF NOT EXISTS idx_global_meals_suitable_for 
  ON global_meals USING GIN ("suitableFor");

CREATE INDEX IF NOT EXISTS idx_global_meals_contraindications 
  ON global_meals USING GIN ("contraindications");

-- Sample tagging examples for recipe curation:
-- 1. High-sugar / refined carb recipes (pancakes, syrups, pastries)
-- UPDATE global_meals 
-- SET "contraindications" = ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'PCOS / PCOD', 'Fatty Liver Disease (NAFLD)']
-- WHERE "mealName" ILIKE '%pancake%' OR "mealName" ILIKE '%syrup%' OR "mealName" ILIKE '%dessert%';

-- 2. Heart-healthy / Low-GI recipes (steel cut oats, grilled salmon, quinoa bowls)
-- UPDATE global_meals 
-- SET "suitableFor" = ARRAY['Type 2 Diabetes', 'Prediabetes / Insulin Resistance', 'Hypertension (High Blood Pressure)', 'High Cholesterol / Dyslipidemia', 'Cardiovascular / Heart Disease']
-- WHERE "mealName" ILIKE '%oat%' OR "mealName" ILIKE '%salmon%' OR "mealName" ILIKE '%quinoa%';

-- 3. High-purine recipes (organ meats, excess red meat)
-- UPDATE global_meals 
-- SET "contraindications" = ARRAY['Gout / High Uric Acid', 'Chronic Kidney Disease (CKD)']
-- WHERE "mealName" ILIKE '%red meat%' OR "mealName" ILIKE '%beef%' OR "mealName" ILIKE '%mutton%';
