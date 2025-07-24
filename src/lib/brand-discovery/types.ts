export interface BrandDiscoverySource {
  id: string
  source_type: 'niche_peer_analysis' | 'manual_research' | 'brand_submission'
  source_identifier: string
  last_analyzed?: Date
  analysis_frequency?: string
  is_active: boolean
}

export interface DiscoveredBrand {
  id?: string
  brand_name: string
  instagram_handle?: string
  website?: string
  discovery_source_id?: string
  discovery_metadata?: any
  confidence_score?: number
  status?: 'pending' | 'researching' | 'qualified' | 'disqualified' | 'added'
  research_notes?: string
}

export interface BrandResearch {
  brand_id?: string
  discovered_brand_id?: string
  research_type: 'instagram_analysis' | 'website_scrape' | 'email_finder' | 'campaign_history'
  priority: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  research_data?: any
  error_message?: string
}

export interface OutreachCampaign {
  id: string
  name: string
  description?: string
  target_brand_criteria: {
    industries?: string[]
    follower_range?: { min: number; max: number }
    locations?: string[]
    brand_values?: string[]
  }
  creator_criteria: {
    niches?: string[]
    follower_range?: { min: number; max: number }
    engagement_rate_min?: number
    locations?: string[]
  }
  status: 'draft' | 'active' | 'paused' | 'completed'
  start_date?: Date
  end_date?: Date
  daily_outreach_limit: number
  total_outreach_target?: number
}

export interface OutreachTracking {
  id: string
  match_id: string
  campaign_id?: string
  outreach_status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'meeting_scheduled' | 'deal_closed'
  outreach_channel: 'email' | 'instagram_dm'
  scheduled_for?: Date
  sent_at?: Date
  opened_at?: Date
  replied_at?: Date
  response_sentiment?: 'positive' | 'neutral' | 'negative'
  response_intent?: 'interested' | 'not_interested' | 'more_info_needed' | 'wrong_contact'
  follow_up_count: number
  next_follow_up_date?: Date
  notes?: string
}

export interface BrandEngagement {
  brand_id: string
  engagement_type: 'instagram_follow' | 'instagram_like' | 'instagram_comment' | 'email_open' | 'email_click'
  engagement_data?: any
  created_at: Date
}

export interface BrandCollaboration {
  id: string
  brand_id: string
  creator_id: string
  outreach_tracking_id?: string
  collaboration_type: 'sponsored_post' | 'product_review' | 'ambassador' | 'event'
  compensation_type: 'paid' | 'product' | 'commission' | 'mixed'
  compensation_amount?: number
  deliverables?: any
  contract_signed_date?: Date
  campaign_start_date?: Date
  campaign_end_date?: Date
  performance_metrics?: any
  creator_rating?: number
  brand_rating?: number
  would_work_again?: boolean
  notes?: string
}