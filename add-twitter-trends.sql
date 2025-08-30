-- Add support for Twitter trends in the existing trend_analysis table
-- The platform column already exists and can differentiate between instagram and twitter

-- 1. Add Twitter-specific fields to metrics JSONB
-- No schema changes needed since we use JSONB for flexible storage

-- 2. Add index for platform-specific queries
CREATE INDEX IF NOT EXISTS idx_trend_platform_niche 
  ON trend_analysis (platform, niche, confidence_score DESC)
  WHERE platform IN ('instagram', 'twitter');

-- 3. Create a view for cross-platform trend analysis
CREATE OR REPLACE VIEW cross_platform_trends AS
SELECT 
  t1.trend_name,
  t1.niche,
  t1.trend_type,
  t1.confidence_score as instagram_confidence,
  t2.confidence_score as twitter_confidence,
  t1.growth_velocity as instagram_growth,
  t2.growth_velocity as twitter_growth,
  t1.engagement_rate as instagram_engagement,
  t2.engagement_rate as twitter_engagement,
  t1.collected_at as instagram_collected,
  t2.collected_at as twitter_collected,
  -- Calculate combined score (Twitter weighted 30%, Instagram 70%)
  (COALESCE(t1.confidence_score, 0) * 0.7 + COALESCE(t2.confidence_score, 0) * 0.3) as combined_score,
  -- Flag if trending on both platforms
  CASE 
    WHEN t1.confidence_score > 60 AND t2.confidence_score > 60 THEN true
    ELSE false
  END as trending_both_platforms
FROM 
  (SELECT * FROM trend_analysis WHERE platform = 'instagram') t1
FULL OUTER JOIN 
  (SELECT * FROM trend_analysis WHERE platform = 'twitter') t2
ON 
  t1.trend_name = t2.trend_name 
  AND t1.niche = t2.niche
  AND DATE(t1.collected_at) = DATE(t2.collected_at)
WHERE 
  t1.trend_name IS NOT NULL OR t2.trend_name IS NOT NULL
ORDER BY 
  combined_score DESC;

-- 4. Create function to get cross-platform trending topics
CREATE OR REPLACE FUNCTION get_cross_platform_trends(
  p_niche VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  trend_name VARCHAR,
  niche VARCHAR,
  instagram_score DECIMAL,
  twitter_score DECIMAL,
  combined_score DECIMAL,
  trending_both BOOLEAN,
  instagram_growth DECIMAL,
  twitter_growth DECIMAL,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cpt.trend_name,
    cpt.niche,
    cpt.instagram_confidence,
    cpt.twitter_confidence,
    cpt.combined_score,
    cpt.trending_both_platforms,
    cpt.instagram_growth,
    cpt.twitter_growth,
    CASE 
      WHEN cpt.trending_both_platforms THEN 'HOT - Trending on both platforms!'
      WHEN cpt.twitter_confidence > 80 AND cpt.instagram_confidence IS NULL THEN 'EMERGING - Strong on Twitter, try on Instagram'
      WHEN cpt.instagram_confidence > 80 AND cpt.twitter_confidence IS NULL THEN 'INSTAGRAM ONLY - May be visual trend'
      WHEN cpt.twitter_growth > 50 THEN 'RISING - Twitter showing strong growth'
      WHEN cpt.instagram_growth > 50 THEN 'INSTAGRAM GROWING - Focus here'
      ELSE 'MONITOR - Keep watching'
    END as recommendation
  FROM cross_platform_trends cpt
  WHERE 
    (p_niche IS NULL OR cpt.niche = p_niche)
    AND (cpt.instagram_confidence > 50 OR cpt.twitter_confidence > 50)
  ORDER BY cpt.combined_score DESC
  LIMIT p_limit;
END;
$$;

-- 5. Add function to predict Instagram trends from Twitter
CREATE OR REPLACE FUNCTION predict_instagram_from_twitter(
  p_days_offset INTEGER DEFAULT 3
)
RETURNS TABLE (
  trend_name VARCHAR,
  niche VARCHAR,
  twitter_score DECIMAL,
  twitter_growth DECIMAL,
  predicted_instagram_score DECIMAL,
  prediction_confidence DECIMAL,
  suggested_action TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH twitter_trends AS (
    SELECT 
      trend_name,
      niche,
      confidence_score,
      growth_velocity,
      collected_at
    FROM trend_analysis
    WHERE 
      platform = 'twitter'
      AND collected_at >= NOW() - INTERVAL '1 day'
      AND confidence_score > 70
      AND growth_velocity > 20
  ),
  instagram_history AS (
    SELECT 
      trend_name,
      niche,
      AVG(confidence_score) as avg_score
    FROM trend_analysis
    WHERE 
      platform = 'instagram'
      AND collected_at >= NOW() - INTERVAL '7 days'
    GROUP BY trend_name, niche
  )
  SELECT 
    tt.trend_name,
    tt.niche,
    tt.confidence_score as twitter_score,
    tt.growth_velocity as twitter_growth,
    -- Predict Instagram score based on Twitter performance
    (tt.confidence_score * 0.8)::DECIMAL as predicted_instagram_score,
    -- Confidence in prediction
    CASE 
      WHEN ih.avg_score IS NOT NULL THEN 85.0  -- Has Instagram history
      WHEN tt.growth_velocity > 50 THEN 75.0    -- Strong Twitter growth
      ELSE 60.0                                  -- Base prediction
    END as prediction_confidence,
    -- Suggested action
    CASE 
      WHEN tt.growth_velocity > 100 THEN 'URGENT - Create content NOW'
      WHEN tt.growth_velocity > 50 THEN 'HIGH PRIORITY - Plan content today'
      WHEN ih.avg_score IS NOT NULL AND ih.avg_score > 60 THEN 'VALIDATED - Has worked before'
      ELSE 'TEST - Try with one post'
    END as suggested_action
  FROM twitter_trends tt
  LEFT JOIN instagram_history ih 
    ON tt.trend_name = ih.trend_name 
    AND tt.niche = ih.niche
  ORDER BY tt.confidence_score * tt.growth_velocity DESC;
END;
$$;

-- 6. Create alert function for hot cross-platform trends
CREATE OR REPLACE FUNCTION get_trend_alerts()
RETURNS TABLE (
  alert_type TEXT,
  trend_name VARCHAR,
  niche VARCHAR,
  message TEXT,
  urgency TEXT,
  platforms TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Hot trends on both platforms
  SELECT 
    'CROSS_PLATFORM_HOT' as alert_type,
    trend_name,
    niche,
    format('🔥 %s is trending on both Twitter and Instagram with %s%% combined score', 
           trend_name, ROUND(combined_score)::TEXT) as message,
    'HIGH' as urgency,
    ARRAY['twitter', 'instagram']::TEXT[] as platforms
  FROM cross_platform_trends
  WHERE trending_both_platforms = true
    AND combined_score > 80
    AND instagram_collected >= NOW() - INTERVAL '1 day'
  
  UNION ALL
  
  -- Emerging Twitter trends
  SELECT 
    'TWITTER_EMERGING' as alert_type,
    trend_name,
    niche,
    format('📈 %s growing %s%% on Twitter - prepare Instagram content', 
           trend_name, ROUND(growth_velocity)::TEXT) as message,
    'MEDIUM' as urgency,
    ARRAY['twitter']::TEXT[] as platforms
  FROM trend_analysis
  WHERE platform = 'twitter'
    AND growth_velocity > 100
    AND confidence_score > 70
    AND collected_at >= NOW() - INTERVAL '1 day'
  
  UNION ALL
  
  -- Instagram trends declining
  SELECT 
    'INSTAGRAM_DECLINING' as alert_type,
    trend_name,
    niche,
    format('📉 %s declining on Instagram (%s%% drop) - pivot needed', 
           trend_name, ABS(ROUND(growth_velocity))::TEXT) as message,
    'LOW' as urgency,
    ARRAY['instagram']::TEXT[] as platforms
  FROM trend_analysis
  WHERE platform = 'instagram'
    AND growth_velocity < -50
    AND collected_at >= NOW() - INTERVAL '1 day'
    
  ORDER BY 
    CASE urgency 
      WHEN 'HIGH' THEN 1 
      WHEN 'MEDIUM' THEN 2 
      ELSE 3 
    END;
END;
$$;

-- Test the setup
SELECT 'Twitter trend support added successfully' as status;