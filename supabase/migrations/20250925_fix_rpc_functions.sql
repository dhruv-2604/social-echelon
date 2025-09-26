-- Fix missing RPC functions for trend analysis
-- These functions are called by the cross-platform analyzer

-- Drop functions if they exist (to fix any ambiguous column issues)
DROP FUNCTION IF EXISTS get_trend_alerts();
DROP FUNCTION IF EXISTS predict_instagram_from_twitter(INTEGER);

-- Create get_trend_alerts function
CREATE OR REPLACE FUNCTION get_trend_alerts()
RETURNS TABLE (
  trend_name TEXT,
  platform TEXT,
  niche TEXT,
  growth_rate NUMERIC,
  engagement_rate NUMERIC,
  urgency TEXT,
  alert_type TEXT,
  message TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (ta.trend_name, ta.platform)
    ta.trend_name::TEXT,
    ta.platform::TEXT,
    ta.niche::TEXT,
    COALESCE(ta.growth_velocity, 0)::NUMERIC as growth_rate,
    COALESCE(ta.engagement_rate, 0)::NUMERIC as engagement_rate,
    CASE 
      WHEN ta.growth_velocity > 50 THEN 'HIGH'
      WHEN ta.growth_velocity > 20 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT as urgency,
    CASE
      WHEN ta.growth_velocity > 50 THEN 'viral_growth'
      WHEN ta.engagement_rate > 10 THEN 'high_engagement'
      WHEN ta.trend_phase = 'emerging' THEN 'emerging_trend'
      ELSE 'standard'
    END::TEXT as alert_type,
    CASE
      WHEN ta.growth_velocity > 50 THEN 'Viral trend detected: ' || ta.trend_name || ' is growing rapidly'
      WHEN ta.engagement_rate > 10 THEN 'High engagement trend: ' || ta.trend_name || ' has exceptional engagement'
      WHEN ta.trend_phase = 'emerging' THEN 'Emerging trend: ' || ta.trend_name || ' is starting to gain traction'
      ELSE 'Monitor trend: ' || ta.trend_name
    END::TEXT as message
  FROM trend_analysis ta
  WHERE ta.collected_at >= NOW() - INTERVAL '7 days'
    AND ta.user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5' -- System user for global trends
    AND (ta.growth_velocity > 20 OR ta.engagement_rate > 5)
  ORDER BY ta.trend_name, ta.platform, ta.collected_at DESC;
END;
$$;

-- Create predict_instagram_from_twitter function
CREATE OR REPLACE FUNCTION predict_instagram_from_twitter(p_days_offset INTEGER DEFAULT 2)
RETURNS TABLE (
  trend_name TEXT,
  twitter_growth NUMERIC,
  predicted_instagram_growth NUMERIC,
  confidence_score NUMERIC,
  prediction_basis TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH twitter_trends AS (
    SELECT 
      tw.trend_name,
      tw.niche,
      AVG(tw.growth_velocity) as avg_growth,
      AVG(tw.engagement_rate) as avg_engagement,
      COUNT(*) as data_points
    FROM trend_analysis tw
    WHERE tw.platform = 'twitter'
      AND tw.collected_at >= NOW() - INTERVAL '7 days'
      AND tw.user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
    GROUP BY tw.trend_name, tw.niche
    HAVING AVG(tw.growth_velocity) > 10
  ),
  instagram_existing AS (
    SELECT 
      ig.trend_name,
      AVG(ig.growth_velocity) as current_growth
    FROM trend_analysis ig
    WHERE ig.platform = 'instagram'
      AND ig.collected_at >= NOW() - INTERVAL '7 days'
      AND ig.user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
    GROUP BY ig.trend_name
  )
  SELECT 
    tt.trend_name::TEXT,
    tt.avg_growth::NUMERIC as twitter_growth,
    -- Predict Instagram growth based on Twitter trends (usually 60-80% of Twitter growth)
    (tt.avg_growth * 0.7)::NUMERIC as predicted_instagram_growth,
    -- Confidence based on data points and existing Instagram presence
    CASE
      WHEN tt.data_points >= 5 AND ie.trend_name IS NOT NULL THEN 85
      WHEN tt.data_points >= 3 THEN 70
      ELSE 50
    END::NUMERIC as confidence_score,
    CASE
      WHEN ie.trend_name IS NOT NULL THEN 
        'Based on ' || tt.data_points || ' Twitter data points and existing Instagram trend'
      ELSE 
        'Based on ' || tt.data_points || ' Twitter data points (new to Instagram)'
    END::TEXT as prediction_basis
  FROM twitter_trends tt
  LEFT JOIN instagram_existing ie ON LOWER(tt.trend_name) = LOWER(ie.trend_name)
  WHERE tt.avg_growth > 15
  ORDER BY tt.avg_growth DESC
  LIMIT 20;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_trend_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION predict_instagram_from_twitter(INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_trend_alerts() IS 'Returns trend alerts for high-growth or high-engagement trends from the last 7 days';
COMMENT ON FUNCTION predict_instagram_from_twitter(INTEGER) IS 'Predicts Instagram trend growth based on Twitter trend data';