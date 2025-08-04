-- Functions for tracking brand outreach and response metrics

-- Increment brand outreach count
CREATE OR REPLACE FUNCTION increment_brand_outreach(brand_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE brands 
  SET total_outreach_sent = COALESCE(total_outreach_sent, 0) + 1
  WHERE id = brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment brand response count
CREATE OR REPLACE FUNCTION increment_brand_responses(brand_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE brands 
  SET total_responses = COALESCE(total_responses, 0) + 1
  WHERE id = brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get brand discovery insights
CREATE OR REPLACE FUNCTION get_brand_insights()
RETURNS TABLE(
  insight_type TEXT,
  insight_value TEXT,
  insight_count BIGINT
) AS $$
BEGIN
  -- Most responsive industries
  RETURN QUERY
  SELECT 
    'most_responsive_industry'::TEXT,
    industry::TEXT,
    COUNT(*)::BIGINT
  FROM brands
  WHERE response_rate > 30
  GROUP BY industry
  ORDER BY COUNT(*) DESC
  LIMIT 5;

  -- Most requested brands not yet in database
  RETURN QUERY
  SELECT 
    'most_requested_missing'::TEXT,
    brand_name::TEXT,
    COUNT(*)::BIGINT
  FROM brand_requests
  WHERE status = 'pending'
  GROUP BY brand_name
  ORDER BY COUNT(*) DESC
  LIMIT 10;

  -- Best performing brand locations
  RETURN QUERY
  SELECT 
    'best_locations'::TEXT,
    headquarters_country::TEXT,
    AVG(response_rate)::BIGINT
  FROM brands
  WHERE total_outreach_sent > 10
  GROUP BY headquarters_country
  ORDER BY AVG(response_rate) DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find brands similar to a given brand (for Companies API integration)
CREATE OR REPLACE FUNCTION find_similar_brands(
  source_brand_id UUID,
  similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE(
  brand_id UUID,
  brand_name TEXT,
  similarity_score DECIMAL,
  similarity_reasons TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH source_brand AS (
    SELECT * FROM brands WHERE id = source_brand_id
  )
  SELECT 
    b.id,
    b.brand_name,
    -- Calculate similarity score based on multiple factors
    (
      CASE WHEN b.industry = sb.industry THEN 0.3 ELSE 0 END +
      CASE WHEN b.company_size = sb.company_size THEN 0.2 ELSE 0 END +
      CASE WHEN b.headquarters_country = sb.headquarters_country THEN 0.1 ELSE 0 END +
      CASE WHEN b.ships_to_countries && sb.ships_to_countries THEN 0.2 ELSE 0 END +
      CASE WHEN b.preferred_creator_size && sb.preferred_creator_size THEN 0.2 ELSE 0 END
    )::DECIMAL AS similarity_score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN b.industry = sb.industry THEN 'Same industry' END,
      CASE WHEN b.company_size = sb.company_size THEN 'Similar company size' END,
      CASE WHEN b.headquarters_country = sb.headquarters_country THEN 'Same country' END,
      CASE WHEN b.ships_to_countries && sb.ships_to_countries THEN 'Overlapping markets' END,
      CASE WHEN b.preferred_creator_size && sb.preferred_creator_size THEN 'Similar creator preferences' END
    ], NULL) AS similarity_reasons
  FROM brands b, source_brand sb
  WHERE b.id != source_brand_id
    AND b.is_active = true
  HAVING (
    CASE WHEN b.industry = sb.industry THEN 0.3 ELSE 0 END +
    CASE WHEN b.company_size = sb.company_size THEN 0.2 ELSE 0 END +
    CASE WHEN b.headquarters_country = sb.headquarters_country THEN 0.1 ELSE 0 END +
    CASE WHEN b.ships_to_countries && sb.ships_to_countries THEN 0.2 ELSE 0 END +
    CASE WHEN b.preferred_creator_size && sb.preferred_creator_size THEN 0.2 ELSE 0 END
  ) >= similarity_threshold
  ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;