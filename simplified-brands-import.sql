-- Simplified Brand Import Schema
-- Matches your CSV format exactly

-- First, let's add the new columns if they don't exist
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS followers TEXT,
ADD COLUMN IF NOT EXISTS industry_niche TEXT,
ADD COLUMN IF NOT EXISTS influencer_types TEXT,
ADD COLUMN IF NOT EXISTS ships_to TEXT,
ADD COLUMN IF NOT EXISTS recent_campaigns TEXT,
ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Import brands with your CSV structure
-- Replace the VALUES with your actual data
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
-- Example: David Yurman
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

-- Add more brands here in the same format
-- Example template:
(
  'Brand Name',
  '@instagram_handle',
  'Location',
  'Follower Count',
  'Industry',
  'Industry Niche Description',
  'Influencer Types and Examples',
  'Ships To Countries (pipe separated)',
  'Recent Campaign Details',
  'Marketing Strategy'
)

-- Use ON CONFLICT to update existing brands
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

-- Verify import
SELECT 
  name,
  instagram_handle,
  location,
  followers,
  industry,
  industry_niche
FROM brands 
ORDER BY name
LIMIT 10;