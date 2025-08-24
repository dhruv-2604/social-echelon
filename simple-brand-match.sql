-- Simple Brand Matching View
-- Creates a view that provides compatibility with existing code

CREATE OR REPLACE VIEW brands_matching AS
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
  created_at,
  last_updated,
  -- Add computed/default columns for compatibility
  industry as sub_industry,
  name as website,  -- placeholder
  industry_niche as description,
  5000 as target_follower_min,  -- default values
  1000000 as target_follower_max,
  2.0 as target_engagement_min,
  ARRAY[industry] as target_niches,
  500 as budget_min,
  5000 as budget_max,
  'contact@brand.com' as contact_email,
  ARRAY['modern', 'clean'] as aesthetic_keywords,
  ARRAY['reels', 'posts'] as content_types,
  ARRAY['quality', 'authenticity'] as brand_values,
  ARRAY['sponsored_post'] as campaign_types,
  'Net 30' as payment_terms,
  'niche' as market_position,
  'steady' as growth_trajectory,
  false as verified,
  80 as data_completeness
FROM brands;

-- The matching service can now query brands_matching instead of brands
-- and get all the fields it expects