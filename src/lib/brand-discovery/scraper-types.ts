export interface ScrapingSource {
  id: string
  source_name: string
  source_url: string
  source_type: 'brand_website' | 'pr_newswire' | 'marketing_blog' | 'influencer_platform' | 'social_media' | 'newsletter'
  scraping_frequency: string
  selectors?: any
  is_active: boolean
  last_scraped_at?: Date
  next_scrape_at?: Date
}

export interface ScrapedOpportunity {
  id?: string
  source_id: string
  opportunity_type: 'campaign_announcement' | 'program_launch' | 'budget_announcement' | 'team_change' | 'product_launch' | 'rfp' | 'open_application'
  brand_name: string
  brand_website?: string
  brand_industry?: string
  title: string
  description?: string
  url: string
  budget_range?: {
    min?: number
    max?: number
    currency?: string
  }
  creator_requirements?: {
    followers?: {
      min?: number
      max?: number
    }
    niches?: string[]
    locations?: string[]
    engagement_rate?: number
  }
  campaign_timeline?: {
    start_date?: string
    end_date?: string
  }
  contact_info?: {
    email?: string
    form_url?: string
    contact_name?: string
  }
  published_date?: string
  deadline?: string
  relevance_score?: number
  status?: 'new' | 'qualified' | 'processed' | 'irrelevant' | 'expired'
  ai_summary?: string
  ai_extracted_requirements?: string[]
  ai_suggested_niches?: string[]
}

export interface BrandQueueItem {
  id: string
  brand_name: string
  brand_website?: string
  discovery_source?: string
  priority: number
  status: 'pending' | 'researching' | 'completed' | 'skipped'
  research_data?: any
  created_at: Date
  processed_at?: Date
}