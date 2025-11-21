-- Dead Letter Queue (DLQ) for permanently failed jobs
-- Captures full context for debugging and manual retry

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Original job info
  original_job_id UUID NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Full payload and context
  payload JSONB,
  error_history JSONB NOT NULL DEFAULT '[]', -- Array of all errors across retries
  final_error TEXT NOT NULL,

  -- Metadata
  retry_count INTEGER NOT NULL,
  max_retries INTEGER NOT NULL,
  original_created_at TIMESTAMPTZ NOT NULL,
  failed_at TIMESTAMPTZ DEFAULT NOW(),

  -- DLQ management
  status VARCHAR(20) DEFAULT 'dead', -- 'dead', 'retrying', 'resolved'
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_dlq_status ON dead_letter_queue(status);
CREATE INDEX idx_dlq_job_type ON dead_letter_queue(job_type);
CREATE INDEX idx_dlq_user_id ON dead_letter_queue(user_id);
CREATE INDEX idx_dlq_failed_at ON dead_letter_queue(failed_at DESC);

-- RLS
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own dead letters
CREATE POLICY "Users can view own dead letters" ON dead_letter_queue
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage all
CREATE POLICY "System can manage dead letters" ON dead_letter_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Function to move failed job to DLQ
CREATE OR REPLACE FUNCTION move_to_dlq(
  p_job_id UUID,
  p_final_error TEXT
)
RETURNS UUID AS $$
DECLARE
  v_job job_queue;
  v_dlq_id UUID;
BEGIN
  -- Get the failed job
  SELECT * INTO v_job FROM job_queue WHERE id = p_job_id;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Insert into DLQ
  INSERT INTO dead_letter_queue (
    original_job_id,
    job_type,
    user_id,
    payload,
    error_history,
    final_error,
    retry_count,
    max_retries,
    original_created_at
  ) VALUES (
    v_job.id,
    v_job.type,
    v_job.user_id,
    v_job.payload,
    COALESCE(
      jsonb_build_array(jsonb_build_object(
        'error', v_job.error,
        'retry', v_job.retry_count,
        'at', NOW()
      )),
      '[]'::jsonb
    ),
    p_final_error,
    v_job.retry_count,
    v_job.max_retries,
    v_job.created_at
  )
  RETURNING id INTO v_dlq_id;

  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql;

-- Updated fail_job function that moves to DLQ on permanent failure
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
    -- Move to DLQ before marking as failed
    PERFORM move_to_dlq(job_id, error_message);

    -- Mark as permanently failed
    UPDATE job_queue
    SET status = 'failed',
        completed_at = NOW(),
        error = error_message
    WHERE id = job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to retry a dead letter
CREATE OR REPLACE FUNCTION retry_dead_letter(
  p_dlq_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_dlq dead_letter_queue;
  v_new_job_id UUID;
BEGIN
  -- Get the dead letter
  SELECT * INTO v_dlq FROM dead_letter_queue WHERE id = p_dlq_id;

  IF v_dlq.id IS NULL THEN
    RAISE EXCEPTION 'Dead letter not found: %', p_dlq_id;
  END IF;

  IF v_dlq.status != 'dead' THEN
    RAISE EXCEPTION 'Dead letter already processed: %', p_dlq_id;
  END IF;

  -- Create new job
  INSERT INTO job_queue (
    type,
    user_id,
    payload,
    priority,
    retry_count,
    max_retries
  ) VALUES (
    v_dlq.job_type,
    v_dlq.user_id,
    v_dlq.payload,
    10, -- High priority for retries
    0,  -- Reset retry count
    v_dlq.max_retries
  )
  RETURNING id INTO v_new_job_id;

  -- Mark DLQ entry as retrying
  UPDATE dead_letter_queue
  SET status = 'retrying',
      resolution_notes = 'Retried as job ' || v_new_job_id::text
  WHERE id = p_dlq_id;

  RETURN v_new_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve a dead letter (mark as handled without retry)
CREATE OR REPLACE FUNCTION resolve_dead_letter(
  p_dlq_id UUID,
  p_notes TEXT,
  p_resolver_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE dead_letter_queue
  SET status = 'resolved',
      resolution_notes = p_notes,
      resolved_at = NOW(),
      resolved_by = p_resolver_id
  WHERE id = p_dlq_id;
END;
$$ LANGUAGE plpgsql;
