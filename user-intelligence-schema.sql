-- User-Generated Intelligence System
-- Learns from successful content patterns across all users

-- Track detailed signals from each piece of content
CREATE TABLE content_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_post_id TEXT NOT NULL,
  
  -- Content attributes
  caption_length INTEGER NOT NULL,
  word_count INTEGER NOT NULL,
  hashtag_count INTEGER NOT NULL,
  mention_count INTEGER NOT NULL,
  emoji_count INTEGER NOT NULL,
  line_break_count INTEGER NOT NULL,
  
  -- Content features
  has_question BOOLEAN DEFAULT FALSE,
  has_call_to_action BOOLEAN DEFAULT FALSE,
  has_carousel BOOLEAN DEFAULT FALSE,
  has_reel BOOLEAN DEFAULT FALSE,
  video_duration INTEGER, -- seconds, if video
  carousel_slides INTEGER, -- count, if carousel
  
  -- Timing
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  
  -- Performance metrics (outcome)
  reach_count INTEGER NOT NULL,
  like_count INTEGER NOT NULL,
  comment_count INTEGER NOT NULL,
  save_count INTEGER NOT NULL,
  share_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) NOT NULL,
  save_rate DECIMAL(5,2), -- saves/reach
  comment_rate DECIMAL(5,2), -- comments/reach
  
  -- Normalized performance score (0-100)
  performance_score INTEGER NOT NULL,
  
  -- User context at time of posting
  follower_count_at_time INTEGER NOT NULL,
  user_niche TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(instagram_post_id)
);

-- Index for efficient pattern analysis
CREATE INDEX idx_signals_performance ON content_signals(performance_score DESC);
CREATE INDEX idx_signals_niche_performance ON content_signals(user_niche, performance_score DESC);
CREATE INDEX idx_signals_user_posted ON content_signals(user_id, posted_at DESC);

-- Discovered patterns from analyzing successful content
CREATE TABLE content_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'caption_length',      -- "Captions 100-150 chars perform best"
    'hashtag_count',       -- "5-7 hashtags optimal"
    'posting_time',        -- "Post at 2PM on Wednesdays"
    'content_format',      -- "Carousels get 2x reach"
    'emoji_usage',         -- "3-5 emojis increase engagement"
    'question_strategy',   -- "Questions boost comments"
    'cta_effectiveness'    -- "CTAs increase saves"
  )),
  
  -- Pattern details
  pattern_description TEXT NOT NULL,
  pattern_value JSONB NOT NULL, -- Flexible storage for different pattern types
  
  -- Performance metrics
  avg_performance_score DECIMAL(5,2) NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL, -- % of posts that succeed with this pattern
  sample_size INTEGER NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Scope
  applicable_niches TEXT[] DEFAULT '{}',
  applicable_follower_range INT4RANGE, -- e.g. '[1000,10000)'
  
  -- Tracking
  first_detected TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_validated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  times_validated INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Weekly aggregated insights per niche
CREATE TABLE niche_intelligence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  niche TEXT NOT NULL,
  
  -- Top performing patterns this week
  top_caption_length INT4RANGE,
  optimal_hashtag_count INTEGER,
  best_posting_hours INTEGER[],
  best_posting_days INTEGER[],
  
  -- Content insights
  best_content_format TEXT,
  avg_emoji_count DECIMAL(3,1),
  question_posts_performance DECIMAL(5,2), -- vs non-question posts
  cta_effectiveness DECIMAL(5,2),
  
  -- Emerging patterns
  emerging_patterns JSONB DEFAULT '[]',
  declining_patterns JSONB DEFAULT '[]',
  
  -- Sample data
  total_posts_analyzed INTEGER NOT NULL,
  total_users_contributing INTEGER NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(week_start, niche)
);

-- User-specific learnings (personalized insights)
CREATE TABLE user_content_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Personal best patterns
  best_caption_length INT4RANGE,
  best_hashtag_count INTEGER,
  best_posting_hour INTEGER,
  best_day_of_week INTEGER,
  best_content_format TEXT,
  
  -- Performance benchmarks
  avg_reach INTEGER,
  avg_engagement_rate DECIMAL(5,2),
  top_10_percent_reach INTEGER, -- Their best performing content threshold
  
  -- Recommendations based on patterns
  recommended_patterns JSONB DEFAULT '[]',
  patterns_to_avoid JSONB DEFAULT '[]',
  
  -- Update tracking
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  posts_analyzed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE content_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE niche_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own signals" ON content_signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all patterns" ON content_patterns
  FOR SELECT USING (true);

CREATE POLICY "Users can view niche intelligence" ON niche_intelligence
  FOR SELECT USING (true);

CREATE POLICY "Users can view own insights" ON user_content_insights
  FOR SELECT USING (auth.uid() = user_id);