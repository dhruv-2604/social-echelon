-- Brand Requests Queue
-- Tracks brands requested by creators that aren't in our database yet

CREATE TABLE IF NOT EXISTS brand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request info
  brand_name TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'dream_brand', -- 'dream_brand', 'past_brand', 'manual'

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'researching', 'added', 'rejected'
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),

  -- Result (if added)
  brand_id UUID REFERENCES brands(id),
  rejection_reason TEXT,

  -- Metadata
  request_count INTEGER DEFAULT 1, -- How many creators requested this brand
  first_requested_at TIMESTAMPTZ DEFAULT NOW(),
  last_requested_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brand_requests_status ON brand_requests(status);
CREATE INDEX idx_brand_requests_name ON brand_requests(LOWER(brand_name));
CREATE INDEX idx_brand_requests_count ON brand_requests(request_count DESC);

-- RLS
ALTER TABLE brand_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all requests
CREATE POLICY "Admins can manage brand requests" ON brand_requests
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON brand_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

-- Function to upsert brand requests (increments count if exists)
CREATE OR REPLACE FUNCTION upsert_brand_request(
  p_brand_name TEXT,
  p_requested_by UUID,
  p_source TEXT DEFAULT 'dream_brand'
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if request already exists
  SELECT id INTO v_request_id
  FROM brand_requests
  WHERE LOWER(brand_name) = LOWER(p_brand_name)
  AND status = 'pending';

  IF v_request_id IS NOT NULL THEN
    -- Update existing request
    UPDATE brand_requests
    SET
      request_count = request_count + 1,
      last_requested_at = NOW()
    WHERE id = v_request_id;
  ELSE
    -- Create new request
    INSERT INTO brand_requests (brand_name, requested_by, source)
    VALUES (p_brand_name, p_requested_by, p_source)
    RETURNING id INTO v_request_id;
  END IF;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;
