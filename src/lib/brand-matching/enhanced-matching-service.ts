import { BrandMatchingEngine } from './matching-algorithm'
import { CreatorProfile } from './creator-profile-schema'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { 
  extractCampaignPatterns, 
  calculateLocationScore,
  CAMPAIGN_PATTERNS 
} from './brand-industry-weights'

export class EnhancedBrandMatchingService {
  private matchingEngine: BrandMatchingEngine

  constructor() {
    this.matchingEngine = new BrandMatchingEngine()
  }

  /**
   * Get personalized brand matches for a creator
   */
  async getMatchesForCreator(creatorId: string, options: {
    limit?: number
    minScore?: number
    excludeMatched?: boolean
  } = {}) {
    const { limit = 100, minScore = 50, excludeMatched = true } = options

    try {
      const supabase = getSupabaseAdmin()
      
      // Get creator profile
      const { data: creatorProfile, error: profileError } = await supabase
        .from('creator_profiles')
        .select('*')
        .eq('user_id', creatorId)
        .single() as { data: any; error: any }

      if (profileError || !creatorProfile) {
        throw new Error('Creator profile not found')
      }

      // Get brands from database with smart filtering
      const brandsQuery = supabase
        .from('brands')
        .select('*')
        // Remove filters for non-existent columns
        // All brands in the table are assumed to be active and work with influencers

      // Filter by creator's location - brands must ship to at least one of creator's audience locations
      const creatorLocations = (creatorProfile.profile_data as any)?.audienceDemographics?.topLocations || []
      const creatorCountries = creatorLocations.map((loc: any) => loc.country)
      
      // Since ships_to is a pipe-separated string, we'll filter in JavaScript after fetching
      // This is less efficient but works with your schema

      // Get brands
      const { data: allBrands, error: brandsError } = await brandsQuery

      if (brandsError || !allBrands) {
        throw new Error('Failed to fetch brands')
      }
      
      // Filter brands by shipping locations
      const brands = allBrands.filter((brand: any) => {
        // If no ships_to data, assume global
        if (!brand.ships_to) return true
        if (brand.ships_to === 'GLOBAL') return true
        
        // Check if brand ships to any of creator's audience countries
        const brandShipsTo = brand.ships_to.split('|')
        return creatorCountries.some((country: string) => 
          brandShipsTo.includes(country)
        )
      })

      // Get already matched brands if excluding
      let matchedBrandIds: string[] = []
      if (excludeMatched) {
        const { data: matches } = await supabase
          .from('user_brand_matches')
          .select('brand_id')
          .eq('user_id', creatorId) as { data: Array<{ brand_id: string }> | null; error: any }

        matchedBrandIds = matches?.map(m => m.brand_id) || []
      }

      // Calculate matches for each brand
      const brandMatches = []
      for (const brand of brands) {
        // Skip if already matched
        if (matchedBrandIds.includes(brand.id as string)) continue

        // Convert database brand to enhanced brand format for matching
        const enhancedBrand = this.convertToEnhancedBrand(brand)
        
        // Pass industry for weighted scoring
        const industry = brand.industry as string
        
        // Calculate match score with industry-specific weights
        const match = this.matchingEngine.calculateMatch(creatorProfile as any, enhancedBrand, industry)
        
        // Only include if above minimum score
        if (match.overallScore >= minScore) {
          brandMatches.push({
            ...match,
            brand: {
              id: brand.id,
              name: brand.name, // Changed from display_name
              instagram: brand.instagram_handle,
              website: brand.website || `https://instagram.com/${brand.instagram_handle}`,
              industry: brand.industry,
              pr_email: `partnerships@${(brand.name as string).toLowerCase().replace(/\s+/g, '')}.com`, // Generated
              typical_budget: this.inferBudgetFromInfluencerTypes((brand as any).influencer_types || ''),
              response_rate: 30 // Default estimate
            }
          })
        }
      }

      // Sort by score and limit
      brandMatches.sort((a, b) => b.overallScore - a.overallScore)
      const topMatches = brandMatches.slice(0, limit)

      // Save matches to database for tracking
      if (topMatches.length > 0) {
        const matchRecords = topMatches.map(match => ({
          user_id: creatorId,
          brand_id: match.brand.id,
          match_score: match.overallScore,
          match_category: match.matchCategory
        }))

        await supabase
          .from('user_brand_matches')
          .upsert(matchRecords, { 
            onConflict: 'user_id,brand_id',
            ignoreDuplicates: true 
          })
      }

      return {
        matches: topMatches,
        totalBrandsAnalyzed: brands.length,
        matchStats: {
          excellent: topMatches.filter(m => m.matchCategory === 'excellent').length,
          good: topMatches.filter(m => m.matchCategory === 'good').length,
          fair: topMatches.filter(m => m.matchCategory === 'fair').length
        }
      }

    } catch (error) {
      console.error('Error getting brand matches:', error)
      throw error
    }
  }

  /**
   * Get brands similar to ones the creator has worked with
   */
  async getSimilarBrandMatches(creatorId: string) {
    try {
      const supabase = getSupabaseAdmin()
      
      // Get creator's past brands
      const { data: profile } = await supabase
        .from('creator_profiles')
        .select('past_brands')
        .eq('user_id', creatorId)
        .single() as { data: { past_brands: string[] } | null; error: any }

      if (!profile?.past_brands || profile.past_brands.length === 0) {
        return []
      }

      // Find those brands in our database
      const { data: knownBrands } = await supabase
        .from('brands')
        .select('id, brand_name')
        .in('brand_name', profile.past_brands.map((b: string) => b.toLowerCase())) as { data: Array<{ id: string; brand_name: string }> | null; error: any }

      if (!knownBrands || knownBrands.length === 0) {
        return []
      }

      // Get similar brands for each known brand
      const { data: similarities } = await supabase
        .from('brand_similarities')
        .select(`
          similar_brand_id,
          similarity_score,
          similarity_reason,
          brands!brand_similarities_similar_brand_id_fkey (
            id,
            display_name,
            instagram_handle,
            industry,
            typical_budget_range
          )
        `)
        .in('brand_id', knownBrands.map(b => b.id))
        .order('similarity_score', { ascending: false })
        .limit(50)

      return similarities || []

    } catch (error) {
      console.error('Error getting similar brands:', error)
      return []
    }
  }

  /**
   * Request brands that creators want to work with
   */
  async getUserRequestedBrands(creatorId: string) {
    try {
      const supabase = getSupabaseAdmin()
      
      const { data: requests } = await supabase
        .from('brand_requests')
        .select('*')
        .eq('user_id', creatorId)
        .order('created_at', { ascending: false })

      return requests || []
    } catch (error) {
      console.error('Error getting brand requests:', error)
      return []
    }
  }

  /**
   * Convert database brand to enhanced brand format for matching algorithm
   * Enhanced with campaign pattern extraction and improved inference
   */
  private convertToEnhancedBrand(dbBrand: any): any {
    // Parse ships_to string to extract countries
    const shipsToCountries = dbBrand.ships_to ? dbBrand.ships_to.split('|') : ['US', 'CA', 'UK'] // Default to major markets
    
    // Extract values from strategy AND recent campaigns
    const strategyValues = this.extractValuesFromStrategy(dbBrand.strategy || '')
    const campaignValues = this.extractValuesFromCampaigns(dbBrand.recent_campaigns || '')
    const extractedValues = [...new Set([...strategyValues, ...campaignValues])]  // Combine and dedupe
    
    // Extract campaign patterns for better matching
    const campaignPatterns = extractCampaignPatterns(
      `${dbBrand.strategy || ''} ${dbBrand.recent_campaigns || ''}`
    )
    
    // Infer budget from influencer types and campaign patterns
    const basebudgetRange = this.inferBudgetFromInfluencerTypes(dbBrand.influencer_types || '')
    const budgetMultiplier = campaignPatterns.partnershipType ? 
      (CAMPAIGN_PATTERNS.partnershipTypes as any)[campaignPatterns.partnershipType]?.budgetMultiplier || 1 : 1
    const budgetRange = {
      min: Math.round(basebudgetRange.min * budgetMultiplier),
      max: Math.round(basebudgetRange.max * budgetMultiplier)
    }
    
    // Map database fields to enhanced brand schema expected by matching algorithm
    return {
      id: dbBrand.id,
      name: dbBrand.name, // Changed from display_name
      industry: dbBrand.industry,
      instagramHandle: dbBrand.instagram_handle,
      website: dbBrand.website || `https://instagram.com/${dbBrand.instagram_handle}`,
      
      values: {
        coreValues: extractedValues, // Extracted from strategy AND campaigns
        esgRating: this.inferESGRating(extractedValues),
        supplyChainEthics: extractedValues.includes('sustainability') ? 'certified' : 'unknown',
        controversyHistory: { hasControversies: false, details: [] },
        campaignThemes: campaignPatterns.themes  // New field for theme matching
      },
      
      targeting: {
        audienceDemographics: {
          ageRanges: ['18-24', '25-34', '35-44'], // Default ranges
          genderPreference: null,
          incomeLevel: ['middle', 'upper-middle'],
          locations: {
            countries: shipsToCountries,
            cities: [], // Extract from location if needed
            shipsToCities: []
          }
        },
        niches: this.extractNiches(dbBrand),
        contentFormats: this.inferContentFormats(dbBrand, campaignPatterns),
        aesthetics: this.extractAesthetics(dbBrand),
        engagementRate: {
          min: 2,
          preferred: 4
        }
      },
      
      campaigns: {
        budgetRange: budgetRange,
        contentRequirements: {
          approvalsNeeded: campaignPatterns.contentFocus.includes('professional') ? 3 : 2,
          usageRights: campaignPatterns.partnershipType === 'ambassador' ? '12 months' : '6 months',
          exclusivity: campaignPatterns.partnershipType ? 
            (CAMPAIGN_PATTERNS.partnershipTypes as any)[campaignPatterns.partnershipType]?.exclusivity || false : false
        },
        recentCampaigns: this.parseRecentCampaigns(dbBrand.recent_campaigns || '')
      },
      
      contacts: {
        primary: {
          email: `partnerships@${dbBrand.name.toLowerCase().replace(/\s+/g, '')}.com`, // Generate from name
          preferredChannel: 'email'
        }
      },
      
      positioning: {
        marketSegment: this.inferMarketSegment(budgetRange),
        pricePoint: this.inferPricePoint(budgetRange),
        brandPersonality: []
      },
      
      history: {
        preferredCreatorSize: this.inferCreatorSizeFromInfluencerTypes(dbBrand.influencer_types || ''),
        successMetrics: {
          avgEngagementRate: this.inferEngagementRequirement(dbBrand.industry),
          avgROI: null
        },
        hasWorkexWithCompetitors: false  // Will be set during matching
      },
      
      intelligence: {
        upcomingCampaigns: [],
        lastCampaignDate: null
      },
      
      automation: {
        decisionMakerActive: true,
        bestOutreachTimes: ['Tuesday 10AM', 'Thursday 2PM']
      }
    }
  }
  
  private extractValuesFromStrategy(strategy: string): string[] {
    const values = []
    const strategyLower = strategy.toLowerCase()
    
    // Original values
    if (strategyLower.includes('authentic')) values.push('authenticity')
    if (strategyLower.includes('sustainab')) values.push('sustainability')
    if (strategyLower.includes('empower')) values.push('empowerment')
    if (strategyLower.includes('inclusi') || strategyLower.includes('divers')) values.push('inclusivity')
    if (strategyLower.includes('innovation') || strategyLower.includes('tech')) values.push('innovation')
    if (strategyLower.includes('luxury') || strategyLower.includes('premium')) values.push('luxury')
    if (strategyLower.includes('community')) values.push('community')
    if (strategyLower.includes('wellness') || strategyLower.includes('health')) values.push('wellness')
    
    // Additional values
    if (strategyLower.includes('quality') || strategyLower.includes('craftsmanship')) values.push('quality')
    if (strategyLower.includes('adventure') || strategyLower.includes('explor')) values.push('adventure')
    if (strategyLower.includes('creativ')) values.push('creativity')
    if (strategyLower.includes('education') || strategyLower.includes('learn')) values.push('education')
    if (strategyLower.includes('family')) values.push('family')
    if (strategyLower.includes('celebrat')) values.push('celebration')
    
    return values
  }
  
  private extractValuesFromCampaigns(campaigns: string): string[] {
    const values = []
    const campaignsLower = campaigns.toLowerCase()
    
    // Extract values mentioned in campaign descriptions
    if (campaignsLower.includes('sustainab') || campaignsLower.includes('eco')) values.push('sustainability')
    if (campaignsLower.includes('divers') || campaignsLower.includes('inclusi')) values.push('inclusivity')
    if (campaignsLower.includes('empower') || campaignsLower.includes('confidence')) values.push('empowerment')
    if (campaignsLower.includes('wellness') || campaignsLower.includes('selfcare')) values.push('wellness')
    if (campaignsLower.includes('luxury') || campaignsLower.includes('premium')) values.push('luxury')
    if (campaignsLower.includes('innovation') || campaignsLower.includes('future')) values.push('innovation')
    if (campaignsLower.includes('authentic') || campaignsLower.includes('real')) values.push('authenticity')
    
    return values
  }
  
  private inferBudgetFromInfluencerTypes(influencerTypes: string): { min: number, max: number } {
    const typesLower = influencerTypes.toLowerCase()
    
    if (typesLower.includes('celebrity') || typesLower.includes('mega')) {
      return { min: 10000, max: 100000 }
    } else if (typesLower.includes('macro')) {
      return { min: 5000, max: 50000 }
    } else if (typesLower.includes('micro')) {
      return { min: 500, max: 5000 }
    } else if (typesLower.includes('nano')) {
      return { min: 100, max: 1000 }
    }
    
    return { min: 1000, max: 10000 } // Default
  }
  
  private inferCreatorSizeFromInfluencerTypes(influencerTypes: string): string {
    const typesLower = influencerTypes.toLowerCase()
    
    if (typesLower.includes('mega') || typesLower.includes('celebrity')) return 'mega'
    if (typesLower.includes('macro')) return 'macro'
    if (typesLower.includes('micro')) return 'micro'
    if (typesLower.includes('nano')) return 'nano'
    
    return 'micro' // Default
  }

  private inferMarketSegment(budgetRange: any): string {
    if (!budgetRange) return 'mid-market'
    const avg = (budgetRange.min + budgetRange.max) / 2
    if (avg < 1000) return 'budget'
    if (avg < 5000) return 'mid-market'
    if (avg < 10000) return 'premium'
    return 'luxury'
  }

  private inferPricePoint(budgetRange: any): string {
    if (!budgetRange) return '$$'
    const avg = (budgetRange.min + budgetRange.max) / 2
    if (avg < 1000) return '$'
    if (avg < 5000) return '$$'
    if (avg < 10000) return '$$$'
    return '$$$$'
  }
  
  private inferESGRating(values: string[]): number | null {
    // Infer ESG rating based on values
    let rating = 50 // Base rating
    if (values.includes('sustainability')) rating += 20
    if (values.includes('inclusivity')) rating += 15
    if (values.includes('community')) rating += 10
    if (values.includes('wellness')) rating += 5
    return Math.min(100, rating)
  }
  
  private extractNiches(dbBrand: any): string[] {
    const niches = []
    
    // Add industry niche
    if (dbBrand.industry_niche) {
      niches.push(...dbBrand.industry_niche.toLowerCase().split(',').map((n: string) => n.trim()))
    }
    
    // Add industry as fallback
    niches.push(dbBrand.industry.toLowerCase())
    
    // Extract from recent campaigns
    const campaigns = (dbBrand.recent_campaigns || '').toLowerCase()
    if (campaigns.includes('fitness')) niches.push('fitness')
    if (campaigns.includes('travel')) niches.push('travel')
    if (campaigns.includes('food')) niches.push('food')
    if (campaigns.includes('tech')) niches.push('technology')
    if (campaigns.includes('beauty')) niches.push('beauty')
    if (campaigns.includes('fashion')) niches.push('fashion')
    if (campaigns.includes('wellness')) niches.push('wellness')
    if (campaigns.includes('lifestyle')) niches.push('lifestyle')
    
    return [...new Set(niches)] // Dedupe
  }
  
  private inferContentFormats(dbBrand: any, campaignPatterns: any): string[] {
    const formats = []
    
    // Check campaign patterns
    if (campaignPatterns.contentFocus.includes('ugc') || campaignPatterns.contentFocus.includes('unboxing')) {
      formats.push('reels', 'stories')
    }
    if (campaignPatterns.contentFocus.includes('tutorial') || campaignPatterns.contentFocus.includes('review')) {
      formats.push('reels', 'carousel')
    }
    if (campaignPatterns.contentFocus.includes('lifestyle')) {
      formats.push('posts', 'stories')
    }
    
    // Check recent campaigns for format mentions
    const campaigns = (dbBrand.recent_campaigns || '').toLowerCase()
    if (campaigns.includes('reel')) formats.push('reels')
    if (campaigns.includes('story') || campaigns.includes('stories')) formats.push('stories')
    if (campaigns.includes('post')) formats.push('posts')
    if (campaigns.includes('carousel')) formats.push('carousel')
    if (campaigns.includes('video')) formats.push('reels')
    
    // Default if nothing found
    if (formats.length === 0) {
      formats.push('posts', 'reels', 'stories')
    }
    
    return [...new Set(formats)] // Dedupe
  }
  
  private extractAesthetics(dbBrand: any): string[] {
    const aesthetics = []
    const text = `${dbBrand.strategy || ''} ${dbBrand.recent_campaigns || ''} ${dbBrand.industry_niche || ''}`.toLowerCase()
    
    // Luxury/Premium aesthetics
    if (text.includes('luxury') || text.includes('premium')) {
      aesthetics.push('luxury', 'sophisticated', 'elegant')
    }
    
    // Modern/Tech aesthetics
    if (text.includes('tech') || text.includes('innovation')) {
      aesthetics.push('modern', 'minimalist', 'clean')
    }
    
    // Natural/Wellness aesthetics
    if (text.includes('wellness') || text.includes('natural') || text.includes('organic')) {
      aesthetics.push('natural', 'earthy', 'calming')
    }
    
    // Fashion aesthetics
    if (text.includes('fashion') || text.includes('style')) {
      aesthetics.push('trendy', 'stylish')
    }
    
    // Vibrant/Youthful aesthetics
    if (text.includes('vibrant') || text.includes('colorful') || text.includes('fun')) {
      aesthetics.push('colorful', 'vibrant', 'playful')
    }
    
    // Authentic aesthetics
    if (text.includes('authentic') || text.includes('real')) {
      aesthetics.push('authentic', 'relatable')
    }
    
    return aesthetics
  }
  
  private inferEngagementRequirement(industry: string): number {
    // Industry-specific engagement expectations
    const requirements: Record<string, number> = {
      'Fashion': 4.0,
      'Beauty': 4.5,
      'Jewelry': 3.5,
      'Jewelry & Accessories': 3.5,
      'Technology': 3.0,
      'Food': 3.5,
      'Beverage': 3.5,
      'Fitness': 4.0,
      'Travel': 3.0,
      'Health & Nutrition': 4.0,
      'Education': 2.5
    }
    
    return requirements[industry] || 3.5
  }
  
  private parseRecentCampaigns(campaigns: string): any[] {
    if (!campaigns) return []
    
    // Simple parser for campaign mentions
    const campaignList = []
    const segments = campaigns.split(',')
    
    for (const segment of segments) {
      if (segment.includes('#') || segment.includes('campaign') || segment.includes('collection')) {
        const campaign = {
          name: segment.trim(),
          theme: this.extractCampaignTheme(segment),
          hasCelebrity: /celebrity|ambassador|influencer/.test(segment.toLowerCase())
        }
        campaignList.push(campaign)
      }
    }
    
    return campaignList
  }
  
  private extractCampaignTheme(campaign: string): string {
    const lower = campaign.toLowerCase()
    if (lower.includes('sustainab') || lower.includes('eco')) return 'sustainability'
    if (lower.includes('summer') || lower.includes('spring') || lower.includes('fall') || lower.includes('winter')) return 'seasonal'
    if (lower.includes('launch') || lower.includes('new')) return 'product launch'
    if (lower.includes('celebrat') || lower.includes('holiday')) return 'celebration'
    if (lower.includes('empower') || lower.includes('confidence')) return 'empowerment'
    return 'general'
  }

  /**
   * Track when outreach is sent to update response rates
   */
  async trackOutreachSent(userId: string, brandId: string) {
    try {
      const supabase = getSupabaseAdmin()
      
      // Update user_brand_matches
      await supabase
        .from('user_brand_matches')
        .update({ 
          outreach_sent: true, 
          outreach_sent_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('brand_id', brandId)

      // Increment brand's total outreach count
      await supabase.rpc('increment_brand_outreach', { brand_id: brandId })

    } catch (error) {
      console.error('Error tracking outreach:', error)
    }
  }

  /**
   * Track response received to calculate response rates
   */
  async trackResponseReceived(userId: string, brandId: string, responseType: 'positive' | 'negative' | 'negotiating') {
    try {
      const supabase = getSupabaseAdmin()
      
      // Update user_brand_matches
      await supabase
        .from('user_brand_matches')
        .update({ 
          response_received: true,
          response_type: responseType
        })
        .eq('user_id', userId)
        .eq('brand_id', brandId)

      // Increment brand's response count
      await supabase.rpc('increment_brand_responses', { brand_id: brandId })

    } catch (error) {
      console.error('Error tracking response:', error)
    }
  }
}