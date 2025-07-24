-- Add past_brands column to creator_profiles table for easier querying
-- This duplicates data from profile_data JSONB but improves query performance

-- Add the column
ALTER TABLE creator_profiles 
ADD COLUMN IF NOT EXISTS past_brands TEXT[] DEFAULT '{}';

-- Create an index for faster searches
CREATE INDEX IF NOT EXISTS idx_creator_profiles_past_brands 
ON creator_profiles USING GIN (past_brands);

-- Update existing records to populate past_brands from profile_data
UPDATE creator_profiles 
SET past_brands = COALESCE(
  ARRAY(
    SELECT jsonb_array_elements_text(profile_data->'identity'->'pastBrands')
  ),
  '{}'::TEXT[]
)
WHERE profile_data->'identity'->'pastBrands' IS NOT NULL;

-- Create a function to automatically sync past_brands when profile_data is updated
CREATE OR REPLACE FUNCTION sync_past_brands()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract past brands from the JSONB profile_data
  NEW.past_brands := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(NEW.profile_data->'identity'->'pastBrands')
    ),
    '{}'::TEXT[]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to keep past_brands in sync with profile_data
DROP TRIGGER IF EXISTS sync_past_brands_trigger ON creator_profiles;
CREATE TRIGGER sync_past_brands_trigger
BEFORE INSERT OR UPDATE ON creator_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_past_brands();

-- Add a column to track the creator's niche(s) for easier querying
ALTER TABLE creator_profiles 
ADD COLUMN IF NOT EXISTS creator_niches TEXT[] DEFAULT '{}';

-- Create an index for niche-based searches
CREATE INDEX IF NOT EXISTS idx_creator_profiles_niches 
ON creator_profiles USING GIN (creator_niches);

-- Update existing records to populate creator_niches from profile_data
UPDATE creator_profiles 
SET creator_niches = COALESCE(
  ARRAY(
    SELECT jsonb_array_elements_text(profile_data->'identity'->'niche')
  ),
  '{}'::TEXT[]
)
WHERE profile_data->'identity'->'niche' IS NOT NULL;

-- Create a function to automatically sync creator_niches when profile_data is updated
CREATE OR REPLACE FUNCTION sync_creator_niches()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract niches from the JSONB profile_data
  NEW.creator_niches := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(NEW.profile_data->'identity'->'niche')
    ),
    '{}'::TEXT[]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to keep creator_niches in sync with profile_data
DROP TRIGGER IF EXISTS sync_creator_niches_trigger ON creator_profiles;
CREATE TRIGGER sync_creator_niches_trigger
BEFORE INSERT OR UPDATE ON creator_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_creator_niches();

-- Create a view for easy brand discovery queries
CREATE OR REPLACE VIEW creator_brand_collaborations AS
SELECT 
  cp.user_id,
  cp.creator_niches,
  unnest(cp.past_brands) AS brand_name,
  p.instagram_username,
  p.follower_count
FROM creator_profiles cp
JOIN profiles p ON p.id = cp.user_id
WHERE cp.onboarding_completed = TRUE
  AND array_length(cp.past_brands, 1) > 0;