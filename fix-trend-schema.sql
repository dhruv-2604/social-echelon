-- Fix Trend Detection Schema Issues
-- This consolidates the trend detection system to use the correct schema

-- 1. First ensure we have the trend_analysis table with proper structure
CREATE TABLE IF NOT EXISTS trend_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- Changed to not require profiles reference for system trends
  platform VARCHAR(20) NOT NULL DEFAULT 'instagram',
  trend_type VARCHAR(20) NOT NULL, -- 'hashtag', 'audio', 'location', 'format', 'topic'
  trend_name VARCHAR(255) NOT NULL,
  niche VARCHAR(100), -- Add niche field for compatibility
  metrics JSONB NOT NULL,
  top_posts JSONB,
  
  -- Additional fields for trend tracking
  growth_velocity DECIMAL(10,2) DEFAULT 0,
  current_volume INTEGER DEFAULT 0,
  engagement_rate DECIMAL(10,2) DEFAULT 0,
  saturation_level DECIMAL(10,2) DEFAULT 0,
  confidence_score DECIMAL(10,2) DEFAULT 50,
  trend_phase VARCHAR(20) DEFAULT 'emerging', -- 'emerging', 'growing', 'peak', 'declining'
  
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint updated to include niche
  UNIQUE(user_id, platform, trend_type, trend_name, niche, DATE(collected_at))
);

-- 2. Create proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_user_platform 
  ON trend_analysis (user_id, platform, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_name 
  ON trend_analysis (trend_name);

CREATE INDEX IF NOT EXISTS idx_trend_niche 
  ON trend_analysis (niche, trend_type, confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_trend_phase 
  ON trend_analysis (trend_phase, updated_at DESC);

-- 3. Fix RLS policies to allow system trends
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can insert own trends" ON trend_analysis;
DROP POLICY IF EXISTS "Users can delete own trends" ON trend_analysis;

-- Create new policies that allow system trends
CREATE POLICY "Users can view trends" ON trend_analysis
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    user_id::text = 'system' OR 
    user_id::text = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY "Users can insert own trends" ON trend_analysis
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR 
    user_id::text = 'system' OR
    user_id::text = '00000000-0000-0000-0000-000000000000'
  );

CREATE POLICY "Users can delete own trends" ON trend_analysis
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Create trend_history table for tracking changes over time
CREATE TABLE IF NOT EXISTS trend_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_analysis_id UUID REFERENCES trend_analysis(id) ON DELETE CASCADE,
  growth_velocity DECIMAL(10,2),
  current_volume INTEGER,
  engagement_rate DECIMAL(10,2),
  saturation_level DECIMAL(10,2),
  confidence_score DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_trend 
  ON trend_history (trend_analysis_id, recorded_at DESC);

-- 5. Migrate any existing data from old 'trends' table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trends') THEN
    -- Migrate data from trends to trend_analysis
    INSERT INTO trend_analysis (
      user_id,
      platform,
      trend_type,
      trend_name,
      niche,
      metrics,
      growth_velocity,
      current_volume,
      engagement_rate,
      saturation_level,
      confidence_score,
      trend_phase,
      created_at,
      updated_at
    )
    SELECT 
      '00000000-0000-0000-0000-000000000000'::UUID as user_id, -- System user
      'instagram' as platform,
      trend_type,
      trend_name,
      niche,
      jsonb_build_object(
        'engagement_rate', engagement_rate,
        'current_volume', current_volume
      ) as metrics,
      growth_velocity,
      current_volume,
      engagement_rate,
      saturation_level,
      confidence_score,
      trend_phase,
      created_at,
      updated_at
    FROM trends
    ON CONFLICT (user_id, platform, trend_type, trend_name, niche, DATE(collected_at)) 
    DO NOTHING;
    
    -- Drop the old table
    DROP TABLE IF EXISTS trends CASCADE;
  END IF;
END $$;

-- 6. Create helper function to get system trends for all users
CREATE OR REPLACE FUNCTION get_system_trends(
  p_niche VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  trend_type VARCHAR,
  trend_name VARCHAR,
  niche VARCHAR,
  metrics JSONB,
  growth_velocity DECIMAL,
  engagement_rate DECIMAL,
  confidence_score DECIMAL,
  trend_phase VARCHAR,
  collected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.trend_type,
    t.trend_name,
    t.niche,
    t.metrics,
    t.growth_velocity,
    t.engagement_rate,
    t.confidence_score,
    t.trend_phase,
    t.collected_at
  FROM trend_analysis t
  WHERE 
    (t.user_id::text = 'system' OR t.user_id::text = '00000000-0000-0000-0000-000000000000')
    AND (p_niche IS NULL OR t.niche = p_niche)
  ORDER BY t.confidence_score DESC, t.collected_at DESC
  LIMIT p_limit;
END;
$$;