-- Brand Discovery and Outreach Management Schema

-- Brand discovery sources tracking
CREATE TABLE IF NOT EXISTS brand_discovery_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'instagram_hashtag', 'competitor_brand', 'creator_mention', 'manual_research'
  source_identifier TEXT NOT NULL, -- hashtag name, competitor brand id, etc.
  last_scraped TIMESTAMP,
  scrape_frequency INTERVAL DEFAULT '7 days',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Discovered brands queue
CREATE TABLE IF NOT EXISTS discovered_brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name TEXT NOT NULL,
  instagram_handle TEXT,
  website TEXT,
  discovery_source_id UUID REFERENCES brand_discovery_sources(id),
  discovery_metadata JSONB, -- store raw discovery data
  confidence_score FLOAT, -- 0-1 score of how likely this is a good brand
  status TEXT DEFAULT 'pending', -- 'pending', 'researching', 'qualified', 'disqualified', 'added'
  research_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Brand research tasks
CREATE TABLE IF NOT EXISTS brand_research_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  discovered_brand_id UUID REFERENCES discovered_brands(id),
  research_type TEXT NOT NULL, -- 'instagram_analysis', 'website_scrape', 'email_finder', 'campaign_history'
  priority INTEGER DEFAULT 5, -- 1-10, higher is more urgent
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  research_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Brand engagement tracking
CREATE TABLE IF NOT EXISTS brand_engagements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id) NOT NULL,
  engagement_type TEXT NOT NULL, -- 'instagram_follow', 'instagram_like', 'instagram_comment', 'email_open', 'email_click'
  engagement_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Creator-brand outreach campaigns
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_brand_criteria JSONB, -- filters for which brands to target
  creator_criteria JSONB, -- filters for which creators to match
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  start_date DATE,
  end_date DATE,
  daily_outreach_limit INTEGER DEFAULT 20,
  total_outreach_target INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Outreach tracking
CREATE TABLE IF NOT EXISTS outreach_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES brand_matches(id),
  campaign_id UUID REFERENCES outreach_campaigns(id),
  outreach_status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'opened', 'replied', 'meeting_scheduled', 'deal_closed'
  outreach_channel TEXT, -- 'email', 'instagram_dm'
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  replied_at TIMESTAMP,
  last_status_update TIMESTAMP DEFAULT NOW(),
  response_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  response_intent TEXT, -- 'interested', 'not_interested', 'more_info_needed', 'wrong_contact'
  follow_up_count INTEGER DEFAULT 0,
  next_follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Brand response templates for automated replies
CREATE TABLE IF NOT EXISTS brand_response_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  intent_type TEXT NOT NULL, -- 'interested', 'more_info_needed', 'rate_request', 'sample_request'
  template_name TEXT NOT NULL,
  response_template TEXT NOT NULL,
  variables JSONB, -- list of variables that can be replaced in template
  usage_count INTEGER DEFAULT 0,
  success_rate FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Brand collaboration history
CREATE TABLE IF NOT EXISTS brand_collaborations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brands(id),
  creator_id UUID REFERENCES profiles(id),
  outreach_tracking_id UUID REFERENCES outreach_tracking(id),
  collaboration_type TEXT, -- 'sponsored_post', 'product_review', 'ambassador', 'event'
  compensation_type TEXT, -- 'paid', 'product', 'commission', 'mixed'
  compensation_amount DECIMAL,
  deliverables JSONB,
  contract_signed_date DATE,
  campaign_start_date DATE,
  campaign_end_date DATE,
  performance_metrics JSONB,
  creator_rating INTEGER, -- 1-5
  brand_rating INTEGER, -- 1-5
  would_work_again BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_discovered_brands_status ON discovered_brands(status);
CREATE INDEX idx_discovered_brands_confidence ON discovered_brands(confidence_score DESC);
CREATE INDEX idx_brand_research_queue_status ON brand_research_queue(status, priority DESC);
CREATE INDEX idx_outreach_tracking_status ON outreach_tracking(outreach_status);
CREATE INDEX idx_outreach_tracking_campaign ON outreach_tracking(campaign_id);
CREATE INDEX idx_brand_collaborations_brand ON brand_collaborations(brand_id);
CREATE INDEX idx_brand_collaborations_creator ON brand_collaborations(creator_id);

-- RLS Policies
ALTER TABLE brand_discovery_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_research_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_collaborations ENABLE ROW LEVEL SECURITY;

-- Admin policies (for your use)
CREATE POLICY "Admins can manage all brand discovery" ON brand_discovery_sources
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can manage discovered brands" ON discovered_brands
  FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Creator policies
CREATE POLICY "Creators can view their outreach tracking" ON outreach_tracking
  FOR SELECT TO authenticated
  USING (match_id IN (
    SELECT id FROM brand_matches WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Creators can view their collaborations" ON brand_collaborations
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid());