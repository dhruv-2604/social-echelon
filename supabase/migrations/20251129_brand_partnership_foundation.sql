-- Brand Partnership Foundation Migration
-- Adds missing fields to brands table + email verification + hiring signals

-- =============================================================================
-- PART 1: Add missing fields that the matching algorithm expects
-- =============================================================================

-- Instagram presence
ALTER TABLE brands ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Shipping/location targeting
ALTER TABLE brands ADD COLUMN IF NOT EXISTS ships_to TEXT; -- Pipe-separated: 'US|CA|UK' or 'GLOBAL'

-- Brand strategy and campaigns
ALTER TABLE brands ADD COLUMN IF NOT EXISTS strategy TEXT; -- Brand's influencer strategy description
ALTER TABLE brands ADD COLUMN IF NOT EXISTS recent_campaigns TEXT; -- Recent campaign descriptions
ALTER TABLE brands ADD COLUMN IF NOT EXISTS influencer_types TEXT; -- 'nano|micro|macro|mega|celebrity'
ALTER TABLE brands ADD COLUMN IF NOT EXISTS industry_niche TEXT; -- More specific than industry

-- =============================================================================
-- PART 2: Email verification fields (Phase 1 core feature)
-- =============================================================================

-- Primary contact email (the one we'll actually use)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS pr_email TEXT;

-- Email verification status
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS email_verification_source TEXT; -- 'hunter', 'manual', 'response'

-- Contact person (if we know who to reach)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_role TEXT; -- 'PR Manager', 'Influencer Lead', etc.

-- =============================================================================
-- PART 3: Hiring signals (to know if brand is actively recruiting)
-- =============================================================================

-- Activity tracking
ALTER TABLE brands ADD COLUMN IF NOT EXISTS last_campaign_date DATE;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS hiring_confidence INTEGER DEFAULT 50; -- 0-100
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_actively_hiring BOOLEAN DEFAULT true;

-- Response history (to calculate real response rates)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS total_outreach_sent INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS positive_responses INTEGER DEFAULT 0;

-- Data freshness
ALTER TABLE brands ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS data_confidence INTEGER DEFAULT 50; -- 0-100

-- =============================================================================
-- PART 4: Helper functions
-- =============================================================================

-- Drop existing functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS calculate_brand_response_rate(UUID);
DROP FUNCTION IF EXISTS increment_brand_outreach(UUID);
DROP FUNCTION IF EXISTS increment_brand_responses(UUID);
DROP FUNCTION IF EXISTS increment_brand_responses(UUID, BOOLEAN);

-- Calculate real response rate for a brand
CREATE OR REPLACE FUNCTION calculate_brand_response_rate(p_brand_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  outreach_count INTEGER;
  response_count INTEGER;
BEGIN
  SELECT total_outreach_sent, total_responses
  INTO outreach_count, response_count
  FROM brands WHERE id = p_brand_id;

  IF outreach_count IS NULL OR outreach_count < 5 THEN
    RETURN 0.15;
  END IF;

  RETURN response_count::DECIMAL / outreach_count::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- Increment outreach count (called when email is sent)
CREATE OR REPLACE FUNCTION increment_brand_outreach(p_brand_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE brands
  SET total_outreach_sent = COALESCE(total_outreach_sent, 0) + 1
  WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql;

-- Increment response count (called when we get a reply)
CREATE OR REPLACE FUNCTION increment_brand_responses(p_brand_id UUID, p_is_positive BOOLEAN DEFAULT false)
RETURNS void AS $$
BEGIN
  UPDATE brands
  SET
    total_responses = COALESCE(total_responses, 0) + 1,
    positive_responses = CASE WHEN p_is_positive THEN COALESCE(positive_responses, 0) + 1 ELSE positive_responses END
  WHERE id = p_brand_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PART 5: Indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_brands_email_verified ON brands(email_verified) WHERE email_verified = true;
CREATE INDEX IF NOT EXISTS idx_brands_actively_hiring ON brands(is_actively_hiring) WHERE is_actively_hiring = true;
CREATE INDEX IF NOT EXISTS idx_brands_hiring_confidence ON brands(hiring_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_brands_industry ON brands(industry);
CREATE INDEX IF NOT EXISTS idx_brands_ships_to ON brands(ships_to);

-- =============================================================================
-- PART 6: Update existing brands with defaults
-- =============================================================================

-- Set reasonable defaults for existing brands
UPDATE brands
SET
  ships_to = COALESCE(ships_to, 'GLOBAL'),
  hiring_confidence = COALESCE(hiring_confidence, 50),
  data_confidence = COALESCE(data_confidence, 30), -- Low confidence for existing data
  is_actively_hiring = COALESCE(is_actively_hiring, true)
WHERE ships_to IS NULL OR hiring_confidence IS NULL;
