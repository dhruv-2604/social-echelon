-- Fix incorrect niche values in trend_analysis table
-- This will reassign hashtags to their proper niche categories

-- First, let's see what we're fixing
SELECT niche, COUNT(*) as count 
FROM trend_analysis 
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
GROUP BY niche
ORDER BY niche;

-- Update incorrect niche values to proper categories
UPDATE trend_analysis
SET niche = 'fitness'
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
  AND niche IN ('gym', 'workout')
  AND platform = 'instagram';

UPDATE trend_analysis
SET niche = 'general'
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
  AND niche IN ('explore', 'trending', 'viral')
  AND platform = 'instagram';

-- Verify the update
SELECT niche, COUNT(*) as count 
FROM trend_analysis 
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
GROUP BY niche
ORDER BY niche;

-- Check which niches are missing (should show food, lifestyle, fashion, etc.)
WITH expected_niches AS (
  SELECT unnest(ARRAY['fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
                      'travel', 'business', 'parenting', 'tech', 'education']) as niche
),
existing_niches AS (
  SELECT DISTINCT niche 
  FROM trend_analysis 
  WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
    AND platform = 'instagram'
)
SELECT e.niche as missing_niche
FROM expected_niches e
LEFT JOIN existing_niches ex ON e.niche = ex.niche
WHERE ex.niche IS NULL
ORDER BY e.niche;