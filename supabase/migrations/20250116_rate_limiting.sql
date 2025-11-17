-- Rate Limiting System
-- Token bucket algorithm implementation using Supabase

-- Main rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identifier (user_id or IP address)
  identifier VARCHAR(255) NOT NULL,

  -- Endpoint being rate limited
  endpoint VARCHAR(255) NOT NULL,

  -- Token bucket state
  tokens_remaining DECIMAL(10, 2) NOT NULL DEFAULT 0,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one bucket per identifier+endpoint combination
  UNIQUE(identifier, endpoint)
);

-- Index for fast lookups during request processing
CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, endpoint);

-- Index for cleanup of stale entries
CREATE INDEX idx_rate_limits_updated ON rate_limits(updated_at);

-- Table for rate limit violations (for monitoring)
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Who violated and where
  identifier VARCHAR(255) NOT NULL,
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

-- Index for violation analysis
CREATE INDEX idx_violations_identifier ON rate_limit_violations(identifier, violated_at DESC);
CREATE INDEX idx_violations_endpoint ON rate_limit_violations(endpoint, violated_at DESC);

-- Cleanup function for old data (run weekly)
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO authenticated;
GRANT SELECT, INSERT ON rate_limit_violations TO authenticated;

-- Comments for documentation
COMMENT ON TABLE rate_limits IS 'Token bucket rate limiting state per identifier and endpoint';
COMMENT ON TABLE rate_limit_violations IS 'Log of rate limit violations for monitoring and abuse detection';
COMMENT ON COLUMN rate_limits.tokens_remaining IS 'Current tokens in bucket (refills over time)';
COMMENT ON COLUMN rate_limits.last_refill_at IS 'Last time tokens were refilled';
