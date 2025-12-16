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