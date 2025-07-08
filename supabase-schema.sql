-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  instagram_username TEXT,
  instagram_id TEXT UNIQUE,
  follower_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  niche TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'pro')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
  stripe_customer_id TEXT
);

-- Create instagram_posts table
CREATE TABLE instagram_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_post_id TEXT NOT NULL,
  caption TEXT,
  media_type TEXT CHECK (media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')),
  media_url TEXT NOT NULL,
  permalink TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  like_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, instagram_post_id)
);

-- Create user_tokens table (encrypted in production)
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  instagram_access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create brands table for partnership opportunities
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  logo_url TEXT,
  description TEXT,
  target_follower_min INTEGER,
  target_follower_max INTEGER,
  target_engagement_min DECIMAL(5,2),
  target_niches TEXT[], -- Array of target niches
  budget_min INTEGER,
  budget_max INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_matches table for AI matching results
CREATE TABLE brand_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) NOT NULL,
  reasons TEXT[],
  status TEXT CHECK (status IN ('pending', 'contacted', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, brand_id)
);

-- Create content_suggestions table for AI recommendations
CREATE TABLE content_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('post', 'story', 'reel', 'carousel')),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  suggested_time TIMESTAMP WITH TIME ZONE,
  hashtags TEXT[],
  status TEXT CHECK (status IN ('pending', 'scheduled', 'posted', 'dismissed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Instagram posts policies
CREATE POLICY "Users can view own posts" ON instagram_posts
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY "Users can insert own posts" ON instagram_posts
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

-- User tokens policies (very restrictive)
CREATE POLICY "Users can view own tokens" ON user_tokens
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY "Users can update own tokens" ON user_tokens
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create content_plans table for AI-generated weekly plans
CREATE TABLE content_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,
  suggestions JSONB NOT NULL,
  overall_strategy TEXT,
  user_preferences JSONB,
  performance_data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX idx_content_plans_user_week ON content_plans(user_id, week_starting);

-- Add RLS policy for content_plans
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content plans" ON content_plans
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

CREATE POLICY "Users can insert own content plans" ON content_plans
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE auth.uid()::text = id::text
    )
  );

-- Insert sample brands for testing
INSERT INTO brands (name, website, industry, description, target_follower_min, target_follower_max, target_engagement_min, target_niches, budget_min, budget_max) VALUES
('FitnessBrand', 'https://fitnessbrand.com', 'Health & Fitness', 'Premium fitness equipment and supplements', 5000, 100000, 3.0, ARRAY['fitness', 'health', 'wellness'], 200, 500),
('WellnessApp', 'https://wellnessapp.com', 'Health & Wellness', 'Meditation and wellness mobile app', 10000, 50000, 4.0, ARRAY['wellness', 'mindfulness', 'lifestyle'], 150, 350),
('SkincarePro', 'https://skincarepro.com', 'Beauty', 'Professional skincare products', 8000, 75000, 3.5, ARRAY['beauty', 'skincare', 'lifestyle'], 300, 800),
('TechGadgets', 'https://techgadgets.com', 'Technology', 'Latest tech accessories and gadgets', 15000, 200000, 2.5, ARRAY['tech', 'lifestyle', 'reviews'], 400, 1200);