import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { BrandDiscoverySource, DiscoveredBrand } from './types'

export class BrandDiscoveryService {
  // Find brands that other creators in the same niche have worked with
  async discoverFromNichePeers(creatorId: string) {
    try {
      // Get the creator's niches from profiles table
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('creator_niches, past_brands')
        .eq('id', creatorId)
        .single() as { data: { creator_niches: string[]; past_brands: string[] } | null; error: any }

      if (!profile || !profile.creator_niches || profile.creator_niches.length === 0) {
        console.log('Creator profile or niches not found')
        return []
      }

      const creatorNiches = profile.creator_niches
      const creatorPastBrands = profile.past_brands || []

      // Use the view to efficiently find brands from peers in the same niche
      const { data: peerBrands } = await supabase
        .from('creator_brand_collaborations')
        .select('brand_name, instagram_username, follower_count')
        .overlaps('creator_niches', creatorNiches)
        .neq('user_id', creatorId) as { data: Array<{brand_name: string; instagram_username: string | null; follower_count: number}> | null; error: any }

      if (!peerBrands || peerBrands.length === 0) {
        return []
      }

      // Count brand frequency and track which creators worked with them
      const brandFrequency = new Map<string, { count: number; creators: Set<string> }>()
      
      for (const record of peerBrands) {
        const brandLower = record.brand_name.toLowerCase().trim()
        
        // Skip if this creator already worked with this brand
        if (creatorPastBrands.some((b: string) => b.toLowerCase() === brandLower)) {
          continue
        }
        
        if (brandLower) {
          const existing = brandFrequency.get(brandLower) || { count: 0, creators: new Set() }
          existing.count++
          existing.creators.add(record.instagram_username || 'creator')
          brandFrequency.set(brandLower, existing)
        }
      }

      // Convert to discovered brands, prioritizing by frequency
      const discoveredBrands: DiscoveredBrand[] = []
      
      for (const [brandName, data] of brandFrequency.entries()) {
        // Calculate confidence based on how many creators worked with this brand
        const confidence = Math.min(0.3 + (data.count * 0.15), 0.9)
        
        discoveredBrands.push({
          brand_name: brandName,
          instagram_handle: brandName.replace(/\s+/g, '').toLowerCase(), // Guess handle
          discovery_metadata: {
            discovery_method: 'niche_peer_analysis',
            creator_count: data.count,
            found_via_creators: Array.from(data.creators).slice(0, 3), // Top 3 creators
            niche_relevance: creatorNiches[0]
          },
          confidence_score: confidence
        })
      }

      // Sort by confidence score (most worked with brands first)
      return discoveredBrands.sort((a: any, b: any) => (b?.confidence_score || 0) - (a?.confidence_score || 0))
      
    } catch (error) {
      console.error('Error in niche peer analysis:', error)
      return []
    }
  }
  
  
  // Calculate confidence score for a discovered brand
  private calculateBrandConfidence(brand: any): number {
    let score = 0
    
    // Follower count (brands typically have 10k+ followers)
    if (brand.follower_count > 100000) score += 0.3
    else if (brand.follower_count > 10000) score += 0.2
    else if (brand.follower_count > 1000) score += 0.1
    
    // Bio indicators
    const bioLower = brand.bio?.toLowerCase() || ''
    if (bioLower.includes('shop') || bioLower.includes('store')) score += 0.2
    if (bioLower.includes('dm for collab') || bioLower.includes('pr@')) score += 0.3
    if (brand.website) score += 0.2
    
    // Post patterns
    if (brand.business_account) score += 0.2
    if (brand.recent_posts?.some((p: any) => p.includes('#ad') || p.includes('sponsored'))) score += 0.1
    
    return Math.min(score, 1)
  }
  
  
  // Get brands that the current creator has already worked with (to exclude from discovery)
  async getCreatorExistingBrands(creatorId: string): Promise<string[]> {
    try {
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('past_brands')
        .eq('id', creatorId)
        .single() as { data: { past_brands: string[] | null } | null; error: any }

      if (!profile?.past_brands) {
        return []
      }

      return profile.past_brands.map((b: string) => b.toLowerCase().trim())
    } catch (error) {
      console.error('Error getting creator existing brands:', error)
      return []
    }
  }
  
  
  // Research a discovered brand to gather more information
  async researchBrand(brandHandle: string) {
    try {
      const research = {
        instagram_data: await this.getInstagramProfile(brandHandle),
        website_data: await this.scrapeWebsite(brandHandle),
        contact_info: await this.findContactInfo(brandHandle),
        campaign_history: await this.analyzePastCampaigns(brandHandle),
        ideal_creator_profile: await this.analyzeIdealCreator(brandHandle)
      }
      
      return research
    } catch (error) {
      console.error('Error researching brand:', error)
      return null
    }
  }
  
  // Get Instagram profile data
  private async getInstagramProfile(handle: string) {
    // Would use Instagram API
    return {
      follower_count: 0,
      following_count: 0,
      post_count: 0,
      bio: '',
      website: '',
      is_business: false,
      category: ''
    }
  }
  
  // Scrape brand website for information
  private async scrapeWebsite(brandHandle: string) {
    // Would use web scraping to find:
    // - About page
    // - Influencer/creator page
    // - Contact information
    // - Product categories
    // - Brand values
    return {}
  }
  
  // Find contact information for the brand
  private async findContactInfo(brandHandle: string) {
    // Would search for:
    // - Email patterns (pr@, influencer@, partnerships@)
    // - Contact forms
    // - Media kit requests
    return {
      emails: [],
      contact_form_url: null,
      preferred_contact_method: 'email'
    }
  }
  
  // Analyze past influencer campaigns
  private async analyzePastCampaigns(brandHandle: string) {
    // Would analyze:
    // - Previous sponsored posts
    // - Creator types they work with
    // - Campaign frequency
    // - Estimated budgets
    return {
      total_campaigns: 0,
      creator_types: [],
      average_creator_size: 0,
      campaign_themes: []
    }
  }
  
  // Determine ideal creator profile for the brand
  private async analyzeIdealCreator(brandHandle: string) {
    // Based on past collaborations, determine:
    // - Ideal follower range
    // - Preferred niches
    // - Content style
    // - Engagement rate requirements
    return {
      follower_range: { min: 0, max: 0 },
      preferred_niches: [],
      min_engagement_rate: 0,
      content_requirements: []
    }
  }
}