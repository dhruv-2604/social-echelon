-- Cleanup and Streamline Brands Table
-- This will keep only the columns you want

-- Step 1: Create a new simplified brands table with only your columns
CREATE TABLE IF NOT EXISTS brands_new (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  instagram_handle TEXT,
  location TEXT,
  followers TEXT,
  industry TEXT,
  industry_niche TEXT,
  influencer_types TEXT,
  ships_to TEXT,
  recent_campaigns TEXT,
  strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Copy existing data to new table (only the columns you want)
INSERT INTO brands_new (
  id,
  name,
  instagram_handle,
  location,
  followers,
  industry,
  industry_niche,
  influencer_types,
  ships_to,
  recent_campaigns,
  strategy,
  created_at,
  last_updated
)
SELECT 
  id,
  name,
  instagram_handle,
  location,
  followers,
  industry,
  industry_niche,
  influencer_types,
  ships_to,
  recent_campaigns,
  strategy,
  COALESCE(created_at, NOW()),
  COALESCE(last_updated, NOW())
FROM brands
ON CONFLICT (name) DO NOTHING;

-- Step 3: Drop the old table and rename the new one
DROP TABLE IF EXISTS brands CASCADE;
ALTER TABLE brands_new RENAME TO brands;

-- Step 4: Recreate necessary indexes
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_industry ON brands(industry);
CREATE INDEX IF NOT EXISTS idx_brands_instagram ON brands(instagram_handle);

-- Step 5: Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple RLS policy (everyone can read brands)
CREATE POLICY "All users can view brands" ON brands
  FOR SELECT USING (true);

-- Step 7: Now import your brands with simplified structure
-- Copy your CSV data here
INSERT INTO brands (
  name,
  instagram_handle,
  location,
  followers,
  industry,
  industry_niche,
  influencer_types,
  ships_to,
  recent_campaigns,
  strategy
) VALUES 
-- Example: David Yurman (replace with your actual data)
(
  'David Yurman',
  '@davidyurman',
  'New York City, USA',
  '814K',
  'Jewelry & Accessories',
  'Luxury fine jewelry, cable jewelry, designer watches',
  'Macro and celebrity influencers (Sofia Richie Grainge, Scarlett Johansson, Blair Eadie)',
  'US|CA|FR|GB|IT|DE',
  '#DYSculptedCable with Sofia Richie Grainge, Michael B. Jordan for The Vault collection',
  'Long-term brand ambassadorships, campaign-specific collaborations, celebrity endorsements'
),
-- Add all your brands here in the same format
-- Just paste your CSV data converted to this SQL format
(
  'Brand Name',
  '@handle',
  'Location',
  'Followers',
  'Industry',
  'Industry Niche',
  'Influencer Types',
  'Ships To',
  'Recent Campaigns',
  'Strategy'
)
-- Continue adding more brands...

ON CONFLICT (name) DO UPDATE SET
  instagram_handle = EXCLUDED.instagram_handle,
  location = EXCLUDED.location,
  followers = EXCLUDED.followers,
  industry = EXCLUDED.industry,
  industry_niche = EXCLUDED.industry_niche,
  influencer_types = EXCLUDED.influencer_types,
  ships_to = EXCLUDED.ships_to,
  recent_campaigns = EXCLUDED.recent_campaigns,
  strategy = EXCLUDED.strategy,
  last_updated = NOW();

-- Verify the import
SELECT COUNT(*) as total_brands FROM brands;
SELECT * FROM brands LIMIT 5;