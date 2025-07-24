-- Schema for automated brand opportunity discovery through web scraping

-- Sources we'll monitor for brand opportunities
CREATE TABLE IF NOT EXISTS scraping_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN (
    'brand_website',        -- Direct brand sites with creator pages
    'pr_newswire',         -- Press releases
    'marketing_blog',      -- Marketing industry blogs
    'influencer_platform', -- Influencer marketing platforms
    'social_media',        -- LinkedIn, Twitter for announcements
    'newsletter'           -- Industry newsletters
  )),
  scraping_frequency TEXT DEFAULT 'daily', -- daily, weekly, realtime
  selectors JSONB, -- CSS/XPath selectors for different elements
  is_active BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  next_scrape_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discovered brand opportunities from scraping
CREATE TABLE IF NOT EXISTS scraped_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES scraping_sources(id),
  
  -- Opportunity details
  opportunity_type TEXT CHECK (opportunity_type IN (
    'campaign_announcement',      -- New influencer campaign
    'program_launch',            -- New creator program
    'budget_announcement',       -- Marketing budget news
    'team_change',              -- New marketing hire
    'product_launch',           -- Product launch needing creators
    'rfp',                      -- Request for proposals
    'open_application'          -- Open creator applications
  )),
  
  -- Brand information
  brand_name TEXT NOT NULL,
  brand_website TEXT,
  brand_industry TEXT,
  
  -- Opportunity specifics
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  
  -- Extracted details
  budget_range JSONB, -- {min: 10000, max: 50000, currency: 'USD'}
  creator_requirements JSONB, -- {followers: {min: 5000}, niches: ['fashion'], locations: ['USA']}
  campaign_timeline JSONB, -- {start_date: '2024-02-01', end_date: '2024-03-01'}
  contact_info JSONB, -- {email: 'creators@brand.com', form_url: '...'}
  
  -- Metadata
  published_date DATE,
  deadline DATE,
  relevance_score DECIMAL(3,2), -- 0-1 score based on matching criteria
  
  -- Processing status
  status TEXT CHECK (status IN (
    'new',           -- Just scraped
    'qualified',     -- Meets our criteria
    'processed',     -- Added to brand database
    'irrelevant',    -- Doesn't match our needs
    'expired'        -- Past deadline
  )) DEFAULT 'new',
  
  -- AI enrichment
  ai_summary TEXT, -- GPT summary of the opportunity
  ai_extracted_requirements TEXT[], -- Key requirements extracted by AI
  ai_suggested_niches TEXT[], -- Niches this would be good for
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(source_id, url)
);

-- Keywords to search for when scraping
CREATE TABLE IF NOT EXISTS scraping_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  keyword_type TEXT CHECK (keyword_type IN (
    'opportunity',  -- 'influencer program', 'creator campaign'
    'budget',      -- 'marketing budget', 'influencer spend'
    'hiring',      -- 'influencer marketing manager', 'creator partnerships'
    'product'      -- 'product launch', 'new collection'
  )),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log of scraping runs
CREATE TABLE IF NOT EXISTS scraping_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES scraping_sources(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  opportunities_found INTEGER DEFAULT 0,
  new_opportunities INTEGER DEFAULT 0,
  error_message TEXT,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands discovered through scraping that we should research
CREATE TABLE IF NOT EXISTS scraping_brand_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name TEXT NOT NULL,
  brand_website TEXT,
  discovery_source TEXT, -- Which scraped opportunity mentioned them
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  status TEXT CHECK (status IN (
    'pending',     -- Waiting to be researched
    'researching', -- Currently being researched
    'completed',   -- Added to brands table
    'skipped'      -- Decided not to add
  )) DEFAULT 'pending',
  research_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(brand_name, brand_website)
);

-- Initial scraping sources
INSERT INTO scraping_sources (source_name, source_url, source_type, selectors) VALUES
-- PR Newswires
('PR Newswire - Influencer Marketing', 'https://www.prnewswire.com/news-releases/news-releases-list/', 'pr_newswire', 
  '{"title": ".news-release-title", "link": ".news-release-title a", "date": ".news-release-date"}'::JSONB),

-- Marketing Blogs
('Influencer Marketing Hub', 'https://influencermarketinghub.com/blog/', 'marketing_blog',
  '{"title": "h2.entry-title", "link": "h2.entry-title a", "excerpt": ".entry-excerpt"}'::JSONB),
  
('Digiday', 'https://digiday.com/marketing/', 'marketing_blog',
  '{"title": "h3.story-title", "link": "h3.story-title a", "date": "time"}'::JSONB),

-- Brand Creator Pages (examples)
('Nike Creator Network', 'https://www.nike.com/creators', 'brand_website',
  '{"apply_button": ".creator-apply", "requirements": ".creator-requirements"}'::JSONB),
  
('Sephora Squad', 'https://www.sephora.com/beauty/sephora-squad', 'brand_website',
  '{"application": ".squad-application", "deadline": ".application-deadline"}'::JSONB),

-- LinkedIn Job Postings
('LinkedIn Influencer Jobs', 'https://www.linkedin.com/jobs/search/?keywords=influencer%20marketing%20manager', 'social_media',
  '{"job_title": ".job-card-title", "company": ".job-card-company", "location": ".job-card-location"}'::JSONB),

-- Industry Newsletters (would need email parsing)
('Morning Brew Marketing', 'https://www.morningbrew.com/marketing', 'newsletter',
  '{"headline": ".headline", "content": ".story-content"}'::JSONB);

-- Initial keywords to look for
INSERT INTO scraping_keywords (keyword, keyword_type) VALUES
-- Opportunity keywords
('influencer program', 'opportunity'),
('creator program', 'opportunity'),
('ambassador program', 'opportunity'),
('influencer campaign', 'opportunity'),
('seeking creators', 'opportunity'),
('looking for influencers', 'opportunity'),
('creator applications', 'opportunity'),
('influencer partnerships', 'opportunity'),

-- Budget keywords
('influencer marketing budget', 'budget'),
('creator budget', 'budget'),
('influencer spend', 'budget'),
('marketing investment', 'budget'),

-- Hiring keywords
('influencer marketing manager', 'hiring'),
('creator partnerships manager', 'hiring'),
('influencer relations', 'hiring'),
('social media manager', 'hiring'),

-- Product keywords
('product launch', 'product'),
('new collection', 'product'),
('launching', 'product'),
('introducing', 'product');

-- Indexes for performance
CREATE INDEX idx_scraped_opportunities_status ON scraped_opportunities(status);
CREATE INDEX idx_scraped_opportunities_brand ON scraped_opportunities(brand_name);
CREATE INDEX idx_scraped_opportunities_created ON scraped_opportunities(created_at DESC);
CREATE INDEX idx_scraping_brand_queue_status ON scraping_brand_queue(status);
CREATE INDEX idx_scraping_logs_source ON scraping_logs(source_id, created_at DESC);

-- Enable RLS
ALTER TABLE scraping_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_brand_queue ENABLE ROW LEVEL SECURITY;

-- Admin policies (only admins can manage scraping)
CREATE POLICY "Admins can manage scraping sources" ON scraping_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()::uuid 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view scraped opportunities" ON scraped_opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()::uuid 
      AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view keywords" ON scraping_keywords
  FOR SELECT USING (true);

CREATE POLICY "Admins can view logs" ON scraping_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid()::uuid 
      AND role = 'admin'
    )
  );