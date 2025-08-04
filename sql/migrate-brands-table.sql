-- Migration to update brands table with better structure
-- This preserves existing data while adding new functionality

-- Add missing columns to brands table if they don't exist
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS headquarters_city TEXT,
ADD COLUMN IF NOT EXISTS is_local_only BOOLEAN DEFAULT false, -- If true, only ships to headquarters_city
ADD COLUMN IF NOT EXISTS discovery_source TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'inactive')),
ADD COLUMN IF NOT EXISTS total_outreach_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brand_values TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_campaign_date DATE,
ADD COLUMN IF NOT EXISTS recent_campaigns TEXT,
ADD COLUMN IF NOT EXISTS influencer_strategy TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update discovery_source for existing records to 'admin'
UPDATE brands SET discovery_source = 'admin' WHERE discovery_source IS NULL;

-- Add computed response_rate column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'brands' AND column_name = 'response_rate') THEN
    ALTER TABLE brands ADD COLUMN response_rate DECIMAL(5,2) GENERATED ALWAYS AS (
      CASE 
        WHEN total_outreach_sent > 0 THEN (total_responses::DECIMAL / total_outreach_sent * 100)
        ELSE 0
      END
    ) STORED;
  END IF;
END $$;

-- Create other tables if they don't exist
CREATE TABLE IF NOT EXISTS brand_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_instagram TEXT,
  brand_website TEXT,
  reason_for_interest TEXT,
  contact_found BOOLEAN DEFAULT false,
  contact_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'researching', 'added', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_similarities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  similar_brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2) CHECK (similarity_score >= 0 AND similarity_score <= 1),
  similarity_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, similar_brand_id)
);

CREATE TABLE IF NOT EXISTS user_brand_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  match_score INTEGER,
  match_category TEXT,
  outreach_sent BOOLEAN DEFAULT false,
  outreach_sent_at TIMESTAMPTZ,
  response_received BOOLEAN DEFAULT false,
  response_type TEXT, -- 'positive', 'negative', 'negotiating'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_brands_industry ON brands(industry);
CREATE INDEX IF NOT EXISTS idx_brands_country ON brands(headquarters_country);
CREATE INDEX IF NOT EXISTS idx_brands_ships_to ON brands USING GIN(ships_to_countries);
CREATE INDEX IF NOT EXISTS idx_brands_headquarters_city ON brands(headquarters_city);
CREATE INDEX IF NOT EXISTS idx_brands_is_local_only ON brands(is_local_only);
CREATE INDEX IF NOT EXISTS idx_brands_creator_size ON brands USING GIN(preferred_creator_size);
CREATE INDEX IF NOT EXISTS idx_brands_response_rate ON brands(response_rate DESC);
CREATE INDEX IF NOT EXISTS idx_brand_requests_user ON brand_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_requests_status ON brand_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_brand_matches_user ON user_brand_matches(user_id);

-- Enable RLS on new tables
ALTER TABLE brand_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brand_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies (only create if they don't exist)
DO $$ 
BEGIN
  -- Policies for brand_requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_requests' AND policyname = 'Users can create brand requests') THEN
    CREATE POLICY "Users can create brand requests" ON brand_requests
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_requests' AND policyname = 'Users can view own brand requests') THEN
    CREATE POLICY "Users can view own brand requests" ON brand_requests
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Policies for brands
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brands' AND policyname = 'All users can view brands') THEN
    CREATE POLICY "All users can view brands" ON brands
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Policies for brand_similarities
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'brand_similarities' AND policyname = 'All users can view brand similarities') THEN
    CREATE POLICY "All users can view brand similarities" ON brand_similarities
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Policies for user_brand_matches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_brand_matches' AND policyname = 'Users can view own matches') THEN
    CREATE POLICY "Users can view own matches" ON user_brand_matches
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace function to handle discovery source
CREATE OR REPLACE FUNCTION set_discovery_source()
RETURNS TRIGGER AS $$
BEGIN
  -- If added_by_user_id is set and discovery_source is default, change it to 'user_request'
  IF NEW.added_by_user_id IS NOT NULL AND NEW.discovery_source = 'admin' THEN
    NEW.discovery_source = 'user_request';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for discovery source
DROP TRIGGER IF EXISTS set_brand_discovery_source ON brands;
CREATE TRIGGER set_brand_discovery_source
  BEFORE INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION set_discovery_source();

-- Create or replace triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_requests_updated_at ON brand_requests;
CREATE TRIGGER update_brand_requests_updated_at BEFORE UPDATE ON brand_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_brand_matches_updated_at ON user_brand_matches;
CREATE TRIGGER update_user_brand_matches_updated_at BEFORE UPDATE ON user_brand_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();