-- Clean up bad trend data with NULL niches and 0 engagement
-- Run this in Supabase SQL editor

-- First, let's see what we're deleting
SELECT COUNT(*) as records_to_delete
FROM trend_analysis
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
  AND (niche IS NULL OR engagement_rate = 0);

-- Delete the bad data
DELETE FROM trend_analysis
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
  AND (niche IS NULL OR engagement_rate = 0);

-- Verify deletion
SELECT 
  niche,
  platform,
  COUNT(*) as trend_count,
  AVG(engagement_rate) as avg_engagement,
  MAX(collected_at) as last_collected
FROM trend_analysis
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
GROUP BY niche, platform
ORDER BY niche, platform;