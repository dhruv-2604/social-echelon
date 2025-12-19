-- Schema Consolidation Migration
-- 1. Merge creator_profiles into profiles
-- 2. Rename profile_id → user_id for consistency
-- 3. Drop unused tables
-- 4. Remove redundant columns

-- =============================================================================
-- PART 1: Add new columns to profiles (from creator_profiles)
-- =============================================================================

-- Add JSONB column for creator data (replaces creator_profiles.profile_data)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_data JSONB;

-- Add arrays for niches and past brands
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS creator_niches TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS past_brands TEXT[] DEFAULT '{}';

-- Add onboarding completed flag (if not exists - we have preferences_set but this is more explicit)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- =============================================================================
-- PART 2: Migrate data from creator_profiles to profiles
-- =============================================================================

-- Copy data from creator_profiles to profiles
UPDATE profiles p
SET
  creator_data = cp.profile_data,
  creator_niches = COALESCE(cp.creator_niches, '{}'),
  past_brands = COALESCE(cp.past_brands, '{}'),
  onboarding_completed = COALESCE(cp.onboarding_completed, false)
FROM creator_profiles cp
WHERE p.id = cp.user_id;

-- =============================================================================
-- PART 3: Drop redundant columns from profiles
-- =============================================================================

-- These are now in creator_data JSONB or redundant
ALTER TABLE profiles DROP COLUMN IF EXISTS primary_goal;
ALTER TABLE profiles DROP COLUMN IF EXISTS content_style;
ALTER TABLE profiles DROP COLUMN IF EXISTS target_audience;
ALTER TABLE profiles DROP COLUMN IF EXISTS voice_tone;
ALTER TABLE profiles DROP COLUMN IF EXISTS preferences_set;

-- Keep 'niche' as it's used for quick filtering, but creator_niches has the full array

-- =============================================================================
-- PART 4: Rename profile_id → user_id in instagram_posts
-- =============================================================================

-- First drop any policies that might reference profile_id
DROP POLICY IF EXISTS "Users can view own posts" ON instagram_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON instagram_posts;

-- Rename the column
ALTER TABLE instagram_posts RENAME COLUMN profile_id TO user_id;

-- Recreate policies with new column name
CREATE POLICY "Users can view own posts" ON instagram_posts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own posts" ON instagram_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update the unique constraint
ALTER TABLE instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_profile_id_instagram_post_id_key;
ALTER TABLE instagram_posts ADD CONSTRAINT instagram_posts_user_id_instagram_post_id_key
  UNIQUE (user_id, instagram_post_id);

-- =============================================================================
-- PART 5: Rename profile_id → user_id in content_suggestions
-- =============================================================================

-- First drop any policies
DROP POLICY IF EXISTS "Users can view own suggestions" ON content_suggestions;
DROP POLICY IF EXISTS "Users can manage own suggestions" ON content_suggestions;

-- Rename the column
ALTER TABLE content_suggestions RENAME COLUMN profile_id TO user_id;

-- Recreate policies
CREATE POLICY "Users can view own suggestions" ON content_suggestions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own suggestions" ON content_suggestions
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- PART 6: Drop unused tables
-- =============================================================================

DROP TABLE IF EXISTS brand_past_campaigns CASCADE;
DROP TABLE IF EXISTS brand_requirements CASCADE;

-- =============================================================================
-- PART 7: Drop creator_profiles table (data migrated to profiles)
-- =============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_creator_profiles_niches;
DROP INDEX IF EXISTS idx_creator_profiles_past_brands;
DROP INDEX IF EXISTS idx_creator_profiles_user_id;

-- Drop the table
DROP TABLE IF EXISTS creator_profiles CASCADE;

-- =============================================================================
-- PART 8: Add indexes for new columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_creator_niches ON profiles USING GIN (creator_niches);
CREATE INDEX IF NOT EXISTS idx_profiles_past_brands ON profiles USING GIN (past_brands);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles (onboarding_completed) WHERE onboarding_completed = true;

-- =============================================================================
-- PART 9: Verify migration
-- =============================================================================

DO $$
DECLARE
  creator_profiles_exists BOOLEAN;
  profile_id_exists BOOLEAN;
BEGIN
  -- Check creator_profiles is dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'creator_profiles'
  ) INTO creator_profiles_exists;

  -- Check profile_id is renamed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instagram_posts' AND column_name = 'profile_id'
  ) INTO profile_id_exists;

  IF creator_profiles_exists THEN
    RAISE WARNING 'creator_profiles table still exists';
  ELSE
    RAISE NOTICE 'creator_profiles successfully dropped';
  END IF;

  IF profile_id_exists THEN
    RAISE WARNING 'profile_id column still exists in instagram_posts';
  ELSE
    RAISE NOTICE 'profile_id successfully renamed to user_id';
  END IF;
END $$;
