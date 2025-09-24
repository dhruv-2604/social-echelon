-- REVISED Algorithm Detection System Database Schema
-- Only tracks real, measurable metrics from Instagram API

-- Simplified performance tracking - daily aggregates only
CREATE TABLE user_performance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Real metrics from Instagram API
  avg_reach INTEGER NOT NULL DEFAULT 0,
  avg_impressions INTEGER NOT NULL DEFAULT 0,
  avg_likes INTEGER NOT NULL DEFAULT 0,
  avg_comments INTEGER NOT NULL DEFAULT 0,
  avg_saves INTEGER NOT NULL DEFAULT 0,
  total_posts INTEGER NOT NULL DEFAULT 0,
  
  -- Calculated metrics
  avg_engagement_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- (likes + comments + saves) / reach
  follower_count INTEGER NOT NULL,
  
  -- Performance by content type (only if we have enough samples)
  reel_avg_reach INTEGER,
  carousel_avg_reach INTEGER,
  post_avg_reach INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate entries
  UNIQUE(user_id, date)
);

-- Index for efficient querying
CREATE INDEX idx_performance_user_date ON user_performance_summary(user_id, date DESC);
CREATE INDEX idx_performance_date ON user_performance_summary(date DESC);

-- Simplified algorithm changes detection
CREATE TABLE algorithm_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'reach_drop',          -- Avg reach dropped >20% for 50+ users
    'reach_increase',      -- Avg reach increased >20% for 50+ users
    'engagement_shift',    -- Engagement rate changed significantly
    'format_preference'    -- One content type suddenly performing better/worse
  )),
  
  -- Measurable impact
  metric_name TEXT NOT NULL,             -- 'avg_reach', 'engagement_rate', etc
  before_value DECIMAL(10,2) NOT NULL,   -- Average before change
  after_value DECIMAL(10,2) NOT NULL,    -- Average after change
  percent_change DECIMAL(5,2) NOT NULL,  -- Percentage change
  
  -- Statistical validation
  affected_users_count INTEGER NOT NULL,  -- How many users affected
  sample_size INTEGER NOT NULL,          -- Total users analyzed
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Scope
  niches_affected TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
    'detected',      -- Just found
    'confirmed',     -- Verified after 48 hours
    'false_positive' -- Turned out to be temporary
  )),
  
  -- Simple, actionable recommendations
  recommendations TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weekly trend summary by niche (populated from real data)
CREATE TABLE niche_performance_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  niche TEXT NOT NULL,
  
  -- Aggregated performance metrics
  avg_reach_per_post INTEGER NOT NULL,
  avg_engagement_rate DECIMAL(5,2) NOT NULL,
  total_users_tracked INTEGER NOT NULL,
  
  -- Best performing content type this week
  best_content_type TEXT,
  best_content_reach INTEGER,
  
  -- Week over week changes
  reach_change_percent DECIMAL(5,2),
  engagement_change_percent DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(week_start, niche)
);

-- Track when users are notified about changes
CREATE TABLE user_algorithm_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  algorithm_change_id UUID REFERENCES algorithm_changes(id) ON DELETE CASCADE,
  
  -- Alert details
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP WITH TIME ZONE,
  action_taken BOOLEAN DEFAULT FALSE,
  
  UNIQUE(user_id, algorithm_change_id)
);

-- Enable Row Level Security
ALTER TABLE user_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE algorithm_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_algorithm_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own performance
CREATE POLICY "Users can view own performance" ON user_performance_summary
  FOR SELECT USING (auth.uid() = user_id);

-- Everyone can view confirmed algorithm changes
CREATE POLICY "Public can view confirmed changes" ON algorithm_changes
  FOR SELECT USING (status = 'confirmed');

-- Everyone can view niche trends
CREATE POLICY "Public can view niche trends" ON niche_performance_trends
  FOR SELECT USING (true);

-- Users can view their own alerts
CREATE POLICY "Users can view own alerts" ON user_algorithm_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Function to calculate daily summaries
CREATE OR REPLACE FUNCTION calculate_daily_performance_summary()
RETURNS void AS $$
BEGIN
  -- This would be called by a scheduled job to aggregate data
  -- Calculates daily averages from Instagram posts data
  -- Much simpler than tracking every single post
END;
$$ LANGUAGE plpgsql;