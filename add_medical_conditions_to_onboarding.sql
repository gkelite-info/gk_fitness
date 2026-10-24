-- Migration: Add medical condition and health disclaimer fields to customer_onboarding
-- Run this in Supabase SQL Editor

ALTER TABLE customer_onboarding
  ADD COLUMN IF NOT EXISTS "hasMedicalConditions" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "medicalConditions" text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "medicalDisclaimerAccepted" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "medicalDisclaimerAcceptedAt" timestamptz;

COMMENT ON COLUMN customer_onboarding."hasMedicalConditions" IS 'Whether the user reported having any pre-existing medical conditions';
COMMENT ON COLUMN customer_onboarding."medicalConditions" IS 'List of self-reported medical conditions (e.g. Type 2 Diabetes, Hypertension, PCOS, etc.)';
COMMENT ON COLUMN customer_onboarding."medicalDisclaimerAccepted" IS 'Whether user explicitly checked and accepted the medical and nutritional disclaimer';
COMMENT ON COLUMN customer_onboarding."medicalDisclaimerAcceptedAt" IS 'Timestamp when user accepted the medical disclaimer before meal plan generation';
