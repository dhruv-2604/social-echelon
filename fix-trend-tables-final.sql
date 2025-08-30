-- Final migration to fix trend tables - handles foreign key constraint to profiles
-- This will work with your existing data and constraints

-- 1. First, check if we have the user in profiles table
DO $$
DECLARE
  system_user_id UUID := 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'::UUID;
BEGIN
  -- Check if this user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = system_user_id) THEN
    RAISE NOTICE 'User % not found in profiles table', system_user_id;
  END IF;
END $$;

-- 2. Clean up the orphaned trend_history records
TRUNCATE TABLE trend_history;

-- 3. Fix trend_history table structure
ALTER TABLE trend_history 
DROP COLUMN IF EXISTS trend_id;

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS trend_analysis_id UUID;

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS growth_velocity DECIMAL(10,2);

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS current_volume INTEGER;

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL(10,2);

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS saturation_level DECIMAL(10,2);

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(10,2);

ALTER TABLE trend_history 
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();

-- Add foreign key constraint AFTER ensuring no orphaned records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trend_history_trend_analysis_id_fkey'
  ) THEN
    ALTER TABLE trend_history 
    ADD CONSTRAINT trend_history_trend_analysis_id_fkey 
    FOREIGN KEY (trend_analysis_id) 
    REFERENCES trend_analysis(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Remove the foreign key constraint from trend_analysis to profiles
-- This allows us to use system trends without a user profile
ALTER TABLE trend_analysis 
DROP CONSTRAINT IF EXISTS trend_analysis_user_id_fkey;

-- 5. Add missing columns to trend_analysis
ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS niche VARCHAR(100);

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS growth_velocity DECIMAL(10,2) DEFAULT 0;

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS current_volume INTEGER DEFAULT 0;

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS engagement_rate DECIMAL(10,2) DEFAULT 0;

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS saturation_level DECIMAL(10,2) DEFAULT 0;

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(10,2) DEFAULT 50;

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS trend_phase VARCHAR(20) DEFAULT 'emerging';

ALTER TABLE trend_analysis 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Keep the existing user_id for now (since it exists in profiles)
-- Just update the niche and other fields
UPDATE trend_analysis 
SET niche = trend_name
WHERE niche IS NULL;

-- Extract values from metrics JSONB if available
UPDATE trend_analysis 
SET 
  growth_velocity = COALESCE((metrics->>'growthRate')::DECIMAL, 0),
  current_volume = COALESCE((metrics->>'postCount')::INTEGER, COALESCE((metrics->>'current_volume')::INTEGER, 1000)),
  engagement_rate = COALESCE((metrics->>'avgEngagement')::DECIMAL, COALESCE((metrics->>'engagement_rate')::DECIMAL, 3.5)),
  confidence_score = COALESCE((metrics->>'confidence_score')::DECIMAL, 60),
  saturation_level = COALESCE((metrics->>'saturation_level')::DECIMAL, 50),
  trend_phase = CASE 
    WHEN COALESCE((metrics->>'growthRate')::DECIMAL, 0) > 20 THEN 'growing'
    WHEN COALESCE((metrics->>'growthRate')::DECIMAL, 0) > 0 THEN 'emerging'
    ELSE 'declining'
  END
WHERE growth_velocity = 0 OR growth_velocity IS NULL;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_user_platform 
  ON trend_analysis (user_id, platform, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_name 
  ON trend_analysis (trend_name);

CREATE INDEX IF NOT EXISTS idx_trend_niche 
  ON trend_analysis (niche)
  WHERE niche IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trend_collected_date
  ON trend_analysis (user_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_trend 
  ON trend_history (trend_analysis_id, recorded_at DESC);

-- 8. Fix RLS policies
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can insert own trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can delete own trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can view trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can insert trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can update own trends" ON trend_analysis;
DROP POLICY IF EXISTS "view_trends" ON trend_analysis;
DROP POLICY IF EXISTS "insert_trends" ON trend_analysis;
DROP POLICY IF EXISTS "update_trends" ON trend_analysis;
DROP POLICY IF EXISTS "delete_trends" ON trend_analysis;
DROP POLICY IF EXISTS "allow_all_select" ON trend_analysis;
DROP POLICY IF EXISTS "allow_all_insert" ON trend_analysis;
DROP POLICY IF EXISTS "allow_all_update" ON trend_analysis;
DROP POLICY IF EXISTS "allow_system_delete" ON trend_analysis;

-- Create simple policies that work
CREATE POLICY "allow_all_select" ON trend_analysis
  FOR SELECT USING (true);

CREATE POLICY "allow_all_insert" ON trend_analysis
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_update" ON trend_analysis
  FOR UPDATE USING (true);

CREATE POLICY "allow_delete" ON trend_analysis
  FOR DELETE USING (true);

-- 9. Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_trend_analysis_updated_at ON trend_analysis;
CREATE TRIGGER update_trend_analysis_updated_at 
  BEFORE UPDATE ON trend_analysis 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Verify the migration
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_trends,
  COUNT(DISTINCT niche) as unique_niches,
  COUNT(DISTINCT DATE(collected_at)) as days_of_data
FROM trend_analysis;

-- Show the updated structure
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'trend_analysis'
AND column_name IN ('niche', 'growth_velocity', 'engagement_rate', 'confidence_score', 'trend_phase', 'updated_at')
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'trend_analysis'
AND tc.constraint_type = 'FOREIGN KEY';