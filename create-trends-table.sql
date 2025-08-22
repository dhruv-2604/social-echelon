-- Create table for storing Instagram trend analysis
CREATE TABLE IF NOT EXISTS trend_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL, -- 'instagram', 'tiktok', 'twitter'
  trend_type VARCHAR(20) NOT NULL, -- 'hashtag', 'audio', 'location'
  trend_name VARCHAR(255) NOT NULL,
  metrics JSONB NOT NULL, -- Flexible metrics storage
  top_posts JSONB, -- Top performing posts
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(user_id, platform, trend_type, trend_name, collected_at)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_trend_user_platform 
  ON trend_analysis (user_id, platform, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_name 
  ON trend_analysis (trend_name);

-- Add RLS policies
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trends
CREATE POLICY "Users can view own trends" ON trend_analysis
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own trends
CREATE POLICY "Users can insert own trends" ON trend_analysis
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own trends
CREATE POLICY "Users can delete own trends" ON trend_analysis
  FOR DELETE
  USING (auth.uid() = user_id);