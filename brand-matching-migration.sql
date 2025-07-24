-- Brand Matching System Database Migration
-- Run this after the existing schema

-- Add unique constraint to brands table for name (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'brands_name_unique'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_name_unique UNIQUE (name);
  END IF;
END $$;

-- Create creator_profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enhanced brands table with all new fields
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS sub_industry TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_role TEXT,
ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT CHECK (preferred_contact_channel IN ('email', 'instagram', 'linkedin')),
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS aesthetic_keywords TEXT[],
ADD COLUMN IF NOT EXISTS content_types TEXT[],
ADD COLUMN IF NOT EXISTS brand_values TEXT[],
ADD COLUMN IF NOT EXISTS audience_demographics JSONB,
ADD COLUMN IF NOT EXISTS past_influencer_size TEXT CHECK (past_influencer_size IN ('nano', 'micro', 'macro', 'mega')),
ADD COLUMN IF NOT EXISTS campaign_types TEXT[],
ADD COLUMN IF NOT EXISTS exclusivity_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS data_completeness INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS esg_rating INTEGER,
ADD COLUMN IF NOT EXISTS employee_satisfaction DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS supply_chain_ethics TEXT CHECK (supply_chain_ethics IN ('certified', 'improving', 'unknown')),
ADD COLUMN IF NOT EXISTS controversy_history JSONB,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS typical_campaign_duration TEXT,
ADD COLUMN IF NOT EXISTS content_approval_rounds INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS revisions_included INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS turnaround_expectation INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS historical_performance JSONB,
ADD COLUMN IF NOT EXISTS upcoming_campaigns JSONB,
ADD COLUMN IF NOT EXISTS competitor_influencers TEXT[],
ADD COLUMN IF NOT EXISTS market_position TEXT CHECK (market_position IN ('leader', 'challenger', 'niche', 'startup')),
ADD COLUMN IF NOT EXISTS growth_trajectory TEXT CHECK (growth_trajectory IN ('rapid', 'steady', 'declining')),
ADD COLUMN IF NOT EXISTS outreach_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS warmup_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS best_outreach_times TEXT[],
ADD COLUMN IF NOT EXISTS avoid_dates DATE[],
ADD COLUMN IF NOT EXISTS personalized_angles TEXT[];

-- Enhanced brand_matches table
ALTER TABLE brand_matches
ADD COLUMN IF NOT EXISTS match_category TEXT CHECK (match_category IN ('excellent', 'good', 'fair', 'poor')),
ADD COLUMN IF NOT EXISTS values_alignment_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS audience_resonance_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS content_style_match_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS success_probability_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS match_breakdown JSONB,
ADD COLUMN IF NOT EXISTS insights JSONB,
ADD COLUMN IF NOT EXISTS suggested_rate INTEGER,
ADD COLUMN IF NOT EXISTS market_rate INTEGER,
ADD COLUMN IF NOT EXISTS estimated_response_rate INTEGER,
ADD COLUMN IF NOT EXISTS outreach_strategy JSONB,
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS next_action TEXT;

-- Create brand_requirements table
CREATE TABLE IF NOT EXISTS brand_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  requirement_type TEXT CHECK (requirement_type IN ('must_have', 'nice_to_have', 'must_not_have')),
  requirement TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_past_campaigns table
CREATE TABLE IF NOT EXISTS brand_past_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  influencer_handle TEXT,
  followers_at_time INTEGER,
  campaign_type TEXT,
  content_url TEXT,
  engagement_rate DECIMAL(5,2),
  roi_multiplier DECIMAL(5,2),
  campaign_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outreach_campaigns table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  brand_match_id UUID REFERENCES brand_matches(id) ON DELETE CASCADE,
  subject_line TEXT NOT NULL,
  email_content TEXT NOT NULL,
  personalization_points TEXT[],
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'sent', 'opened', 'replied', 'accepted', 'rejected')) DEFAULT 'draft',
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create brand_discovery_queue table
CREATE TABLE IF NOT EXISTS brand_discovery_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name TEXT NOT NULL,
  website TEXT,
  instagram_handle TEXT,
  discovery_source TEXT CHECK (discovery_source IN ('marketing_news', 'competitor_tag', 'hashtag_search', 'creator_suggestion', 'trade_publication')),
  discovery_data JSONB,
  processing_status TEXT CHECK (processing_status IN ('pending', 'enriching', 'ready', 'failed')) DEFAULT 'pending',
  processing_notes TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_name, instagram_handle)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_brands_niches ON brands USING GIN (target_niches);
CREATE INDEX IF NOT EXISTS idx_brands_aesthetic ON brands USING GIN (aesthetic_keywords);
CREATE INDEX IF NOT EXISTS idx_brands_values ON brands USING GIN (brand_values);
CREATE INDEX IF NOT EXISTS idx_brands_verified ON brands(verified);
CREATE INDEX IF NOT EXISTS idx_brand_matches_profile ON brand_matches(profile_id);
CREATE INDEX IF NOT EXISTS idx_brand_matches_score ON brand_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_brand_matches_category ON brand_matches(match_category);
CREATE INDEX IF NOT EXISTS idx_brand_matches_status ON brand_matches(status);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_profile ON outreach_campaigns(profile_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_brand_discovery_status ON brand_discovery_queue(processing_status);

-- Enable RLS on new tables
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_past_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_discovery_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_profiles
CREATE POLICY "Users can view own creator profile" ON creator_profiles
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can update own creator profile" ON creator_profiles
  FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can insert own creator profile" ON creator_profiles
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

-- RLS Policies for outreach_campaigns
CREATE POLICY "Users can view own outreach campaigns" ON outreach_campaigns
  FOR SELECT USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can create own outreach campaigns" ON outreach_campaigns
  FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

CREATE POLICY "Users can update own outreach campaigns" ON outreach_campaigns
  FOR UPDATE USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid()::text = id::text));

-- Public read policies for brand data
CREATE POLICY "All users can view brands" ON brands
  FOR SELECT USING (true);

CREATE POLICY "All users can view brand requirements" ON brand_requirements
  FOR SELECT USING (true);

CREATE POLICY "All users can view brand past campaigns" ON brand_past_campaigns
  FOR SELECT USING (true);

-- Add brand_matching_enabled to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS brand_matching_enabled BOOLEAN DEFAULT FALSE;

-- Insert some high-quality sample brands for testing
INSERT INTO brands (
  name, 
  website, 
  instagram_handle,
  industry,
  sub_industry,
  logo_url,
  description,
  target_follower_min,
  target_follower_max,
  target_engagement_min,
  target_niches,
  budget_min,
  budget_max,
  contact_email,
  contact_name,
  contact_role,
  preferred_contact_channel,
  aesthetic_keywords,
  content_types,
  brand_values,
  campaign_types,
  payment_terms,
  market_position,
  growth_trajectory,
  verified,
  data_completeness,
  audience_demographics
) VALUES 
(
  'Patagonia',
  'https://patagonia.com',
  '@patagonia',
  'Fashion',
  'Outdoor Apparel',
  'https://logos.com/patagonia.png',
  'Environmental activism meets outdoor gear',
  10000,
  500000,
  3.0,
  ARRAY['sustainable fashion', 'outdoor lifestyle', 'environmental activism'],
  1000,
  5000,
  'influencers@patagonia.com',
  'Sarah Chen',
  'Influencer Marketing Manager',
  'email',
  ARRAY['natural', 'outdoor', 'authentic', 'rugged'],
  ARRAY['reels', 'carousel', 'stories'],
  ARRAY['sustainability', 'environmental', 'quality', 'activism'],
  ARRAY['sponsored_post', 'ambassador', 'product_seeding'],
  'Net 30',
  'leader',
  'steady',
  true,
  95,
  '{
    "locations": {
      "countries": ["USA", "Canada", "UK", "Germany", "Japan", "Australia", "France", "UAE"],
      "cities": ["Los Angeles", "New York", "San Francisco", "Seattle", "Denver", "Portland", "Chicago", "Atlanta", "Miami", "Paris", "Copenhagen", "Dubai"]
    },
    "ageRanges": ["25-34", "35-44", "18-24"],
    "incomeLevel": ["medium", "high"]
  }'::jsonb
),
(
  'Glossier',
  'https://glossier.com',
  '@glossier',
  'Beauty',
  'Skincare & Makeup',
  'https://logos.com/glossier.png',
  'Beauty that celebrates real skin',
  5000,
  200000,
  4.0,
  ARRAY['beauty', 'skincare', 'minimalist lifestyle'],
  500,
  3000,
  'partners@glossier.com',
  'Emma Rodriguez',
  'Creator Partnerships Lead',
  'instagram',
  ARRAY['minimalist', 'natural', 'dewy', 'fresh'],
  ARRAY['reels', 'tutorials', 'grwm'],
  ARRAY['inclusivity', 'authenticity', 'self-expression', 'community'],
  ARRAY['sponsored_post', 'affiliate', 'product_seeding'],
  'Net 15',
  'challenger',
  'rapid',
  true,
  90,
  '{
    "locations": {
      "countries": ["USA", "UK", "France", "Canada"],
      "cities": ["New York", "Los Angeles", "Miami", "Chicago", "Paris", "London"]
    },
    "ageRanges": ["18-24", "25-34"],
    "incomeLevel": ["medium", "high"],
    "genderPreference": "female"
  }'::jsonb
),
(
  'Athletic Greens',
  'https://athleticgreens.com',
  '@athleticgreens',
  'Health',
  'Supplements',
  'https://logos.com/ag1.png',
  'Daily nutrition made simple',
  10000,
  1000000,
  2.5,
  ARRAY['health', 'fitness', 'wellness', 'biohacking'],
  2000,
  10000,
  'influencer@ag1.com',
  'Marcus Johnson',
  'Head of Influencer Marketing',
  'email',
  ARRAY['clean', 'professional', 'healthy', 'energetic'],
  ARRAY['reels', 'stories', 'testimonials'],
  ARRAY['health', 'performance', 'wellness', 'science-backed'],
  ARRAY['sponsored_post', 'ambassador', 'affiliate'],
  'Net 45',
  'leader',
  'rapid',
  true,
  85,
  '{
    "locations": {
      "countries": ["USA", "Canada", "UK", "Australia", "UAE"],
      "cities": ["Los Angeles", "Miami", "Dubai", "London", "Sydney", "Atlanta"]
    },
    "ageRanges": ["25-34", "35-44", "45-54"],
    "incomeLevel": ["high", "luxury"]
  }'::jsonb
)
ON CONFLICT (name) DO NOTHING;