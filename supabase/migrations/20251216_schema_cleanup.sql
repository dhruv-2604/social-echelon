-- Schema Cleanup Migration
-- Consolidates duplicate tables and removes redundant columns
-- Run this AFTER backing up your database

-- =============================================================================
-- PART 1: Clean up brand_requests duplicate columns
-- =============================================================================

-- The table has both user_id and requested_by (same purpose)
-- Keep user_id, migrate data from requested_by if needed
UPDATE brand_requests
SET user_id = requested_by
WHERE user_id IS NULL AND requested_by IS NOT NULL;

-- The table has both admin_notes and notes (same purpose)
-- Keep notes, migrate data from admin_notes if needed
UPDATE brand_requests
SET notes = COALESCE(notes, '') || CASE WHEN admin_notes IS NOT NULL THEN E'\n[Admin]: ' || admin_notes ELSE '' END
WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Now safe to drop the redundant columns
ALTER TABLE brand_requests DROP COLUMN IF EXISTS requested_by;
ALTER TABLE brand_requests DROP COLUMN IF EXISTS admin_notes;

-- =============================================================================
-- PART 2: Clean up profiles table
-- =============================================================================

-- Remove old subscription_tier column (we use subscription_plan now)
-- First migrate any data if needed
UPDATE profiles
SET subscription_plan = CASE
  WHEN subscription_tier = 'pro' THEN 'harmony'
  WHEN subscription_tier = 'basic' THEN 'balance'
  ELSE subscription_plan
END
WHERE subscription_tier IS NOT NULL AND subscription_plan IS NULL;

ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;

-- =============================================================================
-- PART 3: Drop unused/duplicate tables
-- =============================================================================

-- Drop outreach_campaigns (we use outreach_messages instead)
-- First check if there's data to preserve
DO $$
DECLARE
  campaign_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO campaign_count FROM outreach_campaigns;
  IF campaign_count > 0 THEN
    RAISE NOTICE 'outreach_campaigns has % rows - data will be lost', campaign_count;
  END IF;
END $$;

DROP TABLE IF EXISTS outreach_campaigns CASCADE;

-- Drop brand_matches (we use user_brand_matches instead)
-- First check if there's data to preserve
DO $$
DECLARE
  match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO match_count FROM brand_matches;
  IF match_count > 0 THEN
    RAISE NOTICE 'brand_matches has % rows - data will be lost', match_count;
  END IF;
END $$;

DROP TABLE IF EXISTS brand_matches CASCADE;

-- =============================================================================
-- PART 4: Add missing foreign key constraints with proper naming
-- =============================================================================

-- Ensure user_brand_matches has proper FK to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_brand_matches_user_id_fkey'
    AND table_name = 'user_brand_matches'
  ) THEN
    ALTER TABLE user_brand_matches
    ADD CONSTRAINT user_brand_matches_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure user_brand_matches has proper FK to brands
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_brand_matches_brand_id_fkey'
    AND table_name = 'user_brand_matches'
  ) THEN
    ALTER TABLE user_brand_matches
    ADD CONSTRAINT user_brand_matches_brand_id_fkey
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure outreach_messages has proper FK to user_brand_matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'outreach_messages_match_id_fkey'
    AND table_name = 'outreach_messages'
  ) THEN
    ALTER TABLE outreach_messages
    ADD CONSTRAINT outreach_messages_match_id_fkey
    FOREIGN KEY (match_id) REFERENCES user_brand_matches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- PART 5: Clean up orphaned indexes (if tables were dropped)
-- =============================================================================

-- These will fail silently if they don't exist
DROP INDEX IF EXISTS idx_brand_matches_category;
DROP INDEX IF EXISTS idx_brand_matches_profile;
DROP INDEX IF EXISTS idx_brand_matches_score;
DROP INDEX IF EXISTS idx_brand_matches_status;
DROP INDEX IF EXISTS idx_outreach_campaigns_profile;
DROP INDEX IF EXISTS idx_outreach_campaigns_status;

-- =============================================================================
-- PART 6: Verify final state
-- =============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('brand_matches', 'outreach_campaigns');

  IF table_count = 0 THEN
    RAISE NOTICE 'Schema cleanup completed successfully';
  ELSE
    RAISE WARNING 'Some tables were not dropped - check for dependencies';
  END IF;
END $$;
