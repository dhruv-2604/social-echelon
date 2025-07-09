-- Trends table for storing all trending data
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche TEXT NOT NULL,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('hashtag', 'topic', 'format', 'audio')),
  trend_name TEXT NOT NULL,
  
  -- Scoring metrics
  growth_velocity INTEGER CHECK (growth_velocity >= -100 AND growth_velocity <= 100),
  current_volume INTEGER,
  engagement_rate DECIMAL(5,2),
  saturation_level INTEGER CHECK (saturation_level >= 0 AND saturation_level <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Timing
  first_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  peak_time TIMESTAMP WITH TIME ZONE,
  trend_phase TEXT CHECK (trend_phase IN ('emerging', 'growing', 'peak', 'declining')),
  
  -- Meta data
  related_hashtags TEXT[],
  example_posts JSONB,
  optimal_posting_times INTEGER[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique trends per niche
  UNIQUE(niche, trend_type, trend_name)
);

-- Trend history for tracking changes over time
CREATE TABLE trend_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES trends(id) ON DELETE CASCADE,
  growth_velocity INTEGER,
  current_volume INTEGER,
  engagement_rate DECIMAL(5,2),
  saturation_level INTEGER,
  confidence_score INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Niche competitors for analysis
CREATE TABLE niche_competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  niche TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  instagram_id TEXT,
  follower_count INTEGER,
  engagement_rate DECIMAL(5,2),
  content_style TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(niche, instagram_username)
);

-- Indexes for performance
CREATE INDEX idx_trends_niche ON trends(niche);
CREATE INDEX idx_trends_phase ON trends(trend_phase);
CREATE INDEX idx_trends_confidence ON trends(confidence_score DESC);
CREATE INDEX idx_trend_history_trend ON trend_history(trend_id);
CREATE INDEX idx_trend_history_recorded ON trend_history(recorded_at DESC);

-- Add RLS policies
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_competitors ENABLE ROW LEVEL SECURITY;

-- Public read access for trends (all users can see trends)
CREATE POLICY "Trends are publicly readable" ON trends
  FOR SELECT USING (true);

CREATE POLICY "Trend history is publicly readable" ON trend_history
  FOR SELECT USING (true);

CREATE POLICY "Competitors are publicly readable" ON niche_competitors
  FOR SELECT USING (true);