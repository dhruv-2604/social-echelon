-- Outreach Messages Table
-- Tracks all emails sent to brands with status and follow-up scheduling

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  match_id UUID REFERENCES user_brand_matches(id) ON DELETE SET NULL,

  -- Email content
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'failed'
  message_id TEXT, -- Resend message ID
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,

  -- Follow-up management
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES outreach_messages(id), -- For follow-ups

  -- Response tracking
  response_sentiment TEXT, -- 'positive', 'negative', 'neutral'
  response_notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_user ON outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_brand ON outreach_messages(brand_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_messages(status);
CREATE INDEX IF NOT EXISTS idx_outreach_follow_up ON outreach_messages(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at ON outreach_messages(sent_at DESC);

-- RLS
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own outreach
DROP POLICY IF EXISTS "Users can view own outreach" ON outreach_messages;
CREATE POLICY "Users can view own outreach" ON outreach_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own outreach
DROP POLICY IF EXISTS "Users can create own outreach" ON outreach_messages;
CREATE POLICY "Users can create own outreach" ON outreach_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- System can update any outreach (for webhooks/tracking)
DROP POLICY IF EXISTS "System can update outreach" ON outreach_messages;
CREATE POLICY "System can update outreach" ON outreach_messages
  FOR UPDATE USING (auth.role() = 'service_role');

-- Add outreach_sent columns to user_brand_matches if not exists
ALTER TABLE user_brand_matches ADD COLUMN IF NOT EXISTS outreach_sent BOOLEAN DEFAULT false;
ALTER TABLE user_brand_matches ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ;
