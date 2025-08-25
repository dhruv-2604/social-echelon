import { BrandMatchingEngine } from './matching-algorithm'
import { CreatorProfile } from './creator-profile-schema'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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
        
        // Calculate match score
        const match = this.matchingEngine.calculateMatch(creatorProfile as any, enhancedBrand)
        
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
   */
  private convertToEnhancedBrand(dbBrand: any): any {
    // Parse ships_to string to extract countries
    const shipsToCountries = dbBrand.ships_to ? dbBrand.ships_to.split('|') : []
    
    // Extract values from strategy field
    const extractedValues = this.extractValuesFromStrategy(dbBrand.strategy || '')
    
    // Infer budget from influencer types
    const budgetRange = this.inferBudgetFromInfluencerTypes(dbBrand.influencer_types || '')
    
    // Map database fields to enhanced brand schema expected by matching algorithm
    return {
      id: dbBrand.id,
      name: dbBrand.name, // Changed from display_name
      industry: dbBrand.industry,
      instagramHandle: dbBrand.instagram_handle,
      website: dbBrand.website || `https://instagram.com/${dbBrand.instagram_handle}`,
      
      values: {
        coreValues: extractedValues, // Extracted from strategy
        esgRating: null,
        supplyChainEthics: 'unknown',
        controversyHistory: { hasControversies: false, details: [] }
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
        niches: [dbBrand.industry_niche?.toLowerCase() || dbBrand.industry.toLowerCase()],
        contentFormats: ['posts', 'reels', 'stories'], // Default formats
        aesthetics: [],
        engagementRate: {
          min: 2,
          preferred: 4
        }
      },
      
      campaigns: {
        budgetRange: budgetRange,
        contentRequirements: {
          approvalsNeeded: 2,
          usageRights: '6 months',
          exclusivity: false
        }
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
          avgEngagementRate: 3.5,
          avgROI: null
        }
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
    
    if (strategyLower.includes('authentic')) values.push('authenticity')
    if (strategyLower.includes('sustainab')) values.push('sustainability')
    if (strategyLower.includes('empower')) values.push('empowerment')
    if (strategyLower.includes('inclusi')) values.push('inclusivity')
    if (strategyLower.includes('innovation')) values.push('innovation')
    if (strategyLower.includes('luxury')) values.push('luxury')
    if (strategyLower.includes('community')) values.push('community')
    if (strategyLower.includes('wellness')) values.push('wellness')
    
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