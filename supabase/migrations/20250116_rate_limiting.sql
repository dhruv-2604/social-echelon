-- Rate Limiting System - Authenticated Users Only
-- Token bucket algorithm implementation using Supabase
-- NOTE: Public endpoints are NOT protected by this system

-- Main rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Endpoint being rate limited
  endpoint VARCHAR(255) NOT NULL,

  -- Token bucket state
  tokens_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one bucket per user+endpoint combination
  UNIQUE(user_id, endpoint)
);

-- Indexes for fast lookups
CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_user_endpoint ON rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_updated ON rate_limits(updated_at);

-- Table for rate limit violations (monitoring and abuse detection)
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Where violation occurred
  endpoint VARCHAR(255) NOT NULL,

  -- Context
  tokens_requested DECIMAL(10, 2) NOT NULL,
  tokens_available DECIMAL(10, 2) NOT NULL,

  -- Request details (for debugging)
  ip_address INET,
  user_agent TEXT,

  -- When
  violated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for violation analysis
CREATE INDEX idx_violations_user ON rate_limit_violations(user_id, violated_at DESC);
CREATE INDEX idx_violations_endpoint ON rate_limit_violations(endpoint, violated_at DESC);
CREATE INDEX idx_violations_violated_at ON rate_limit_violations(violated_at DESC);

-- Enable Row Level Security
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view their own rate limit data
CREATE POLICY "Users can view own rate limits" ON rate_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own violations" ON rate_limit_violations
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies - System can manage everything
CREATE POLICY "System can manage rate limits" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage violations" ON rate_limit_violations
  FOR ALL USING (auth.role() = 'service_role');

-- Cleanup function for old data (run weekly via cron)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete rate limit entries not updated in 7 days
  DELETE FROM rate_limits
  WHERE updated_at < NOW() - INTERVAL '7 days';

  -- Delete violation logs older than 30 days
  DELETE FROM rate_limit_violations
  WHERE violated_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Trigger to update updated_at column
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Token bucket rate limiting for authenticated users only. Public endpoints are not protected.';
COMMENT ON TABLE rate_limit_violations IS 'Log of rate limit violations for monitoring and abuse detection';
COMMENT ON COLUMN rate_limits.tokens_remaining IS 'Current tokens in bucket (refills at configured rate)';
COMMENT ON COLUMN rate_limits.last_refill_at IS 'Last time tokens were refilled (used to calculate current tokens)';
