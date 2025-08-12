-- Create job_queue table for managing background tasks
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'algorithm_detection', 'content_generation', 'trend_collection', etc.
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10, higher = more urgent
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  payload JSONB, -- Task-specific data
  result JSONB, -- Result data after completion
  error TEXT, -- Error message if failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT NOW() -- For delayed/scheduled jobs
);

-- Create indexes for efficient queries
CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_priority ON job_queue(priority DESC);
CREATE INDEX idx_job_queue_user_id ON job_queue(user_id);
CREATE INDEX idx_job_queue_type ON job_queue(type);
CREATE INDEX idx_job_queue_scheduled ON job_queue(scheduled_for);
CREATE INDEX idx_job_queue_created ON job_queue(created_at);

-- Create cache_results table for storing API responses
CREATE TABLE IF NOT EXISTS cache_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL, -- Unique identifier for cached data
  cache_type VARCHAR(50) NOT NULL, -- 'instagram_media', 'instagram_insights', 'openai_response', etc.
  data JSONB NOT NULL, -- Cached response data
  metadata JSONB, -- Additional metadata (headers, rate limits, etc.)
  expires_at TIMESTAMPTZ NOT NULL, -- When cache expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1
);

-- Create indexes for cache lookups
CREATE INDEX idx_cache_key ON cache_results(cache_key);
CREATE INDEX idx_cache_type ON cache_results(cache_type);
CREATE INDEX idx_cache_expires ON cache_results(expires_at);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache_results WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get next job from queue
CREATE OR REPLACE FUNCTION get_next_job()
RETURNS job_queue AS $$
DECLARE
  next_job job_queue;
BEGIN
  -- Select the highest priority pending job that's scheduled to run
  SELECT * INTO next_job
  FROM job_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND retry_count < max_retries
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- Mark it as processing if found
  IF next_job.id IS NOT NULL THEN
    UPDATE job_queue
    SET status = 'processing',
        started_at = NOW()
    WHERE id = next_job.id;
  END IF;
  
  RETURN next_job;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_job(
  job_id UUID,
  result_data JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE job_queue
  SET status = 'completed',
      completed_at = NOW(),
      result = result_data
  WHERE id = job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_job(
  job_id UUID,
  error_message TEXT
)
RETURNS void AS $$
DECLARE
  job job_queue;
BEGIN
  SELECT * INTO job FROM job_queue WHERE id = job_id;
  
  IF job.retry_count < job.max_retries THEN
    -- Reschedule with exponential backoff
    UPDATE job_queue
    SET status = 'pending',
        retry_count = retry_count + 1,
        error = error_message,
        scheduled_for = NOW() + INTERVAL '1 minute' * POWER(2, retry_count)
    WHERE id = job_id;
  ELSE
    -- Mark as permanently failed
    UPDATE job_queue
    SET status = 'failed',
        completed_at = NOW(),
        error = error_message
    WHERE id = job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_queue
-- Users can only see their own jobs
CREATE POLICY "Users can view own jobs" ON job_queue
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage all jobs (for admin/cron operations)
CREATE POLICY "System can manage all jobs" ON job_queue
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for cache_results
-- Cache is readable by all authenticated users
CREATE POLICY "Authenticated users can read cache" ON cache_results
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only system can write to cache
CREATE POLICY "System can manage cache" ON cache_results
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update accessed_at when cache is read
CREATE OR REPLACE FUNCTION update_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = NOW();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cache_access_trigger
  BEFORE UPDATE ON cache_results
  FOR EACH ROW
  WHEN (OLD.data IS NOT DISTINCT FROM NEW.data)
  EXECUTE FUNCTION update_cache_access();