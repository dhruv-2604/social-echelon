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
        .eq('is_active', true)
        .eq('works_with_influencers', true)

      // Filter by creator's location - brands must ship to at least one of creator's audience locations
      const creatorLocations = (creatorProfile.audience_demographics as any)?.topLocations || []
      const creatorCountries = creatorLocations.map((loc: any) => loc.country)
      const creatorCities = creatorLocations.map((loc: any) => loc.city).filter(Boolean)
      
      if (creatorCountries.length > 0) {
        // For local-only brands, check if creator has audience in that specific city
        // For national/international brands, check country overlap
        brandsQuery.or(
          `and(is_local_only.eq.false,ships_to_countries.ov.{${creatorCountries.join(',')}}),` +
          `and(is_local_only.eq.true,headquarters_city.in.(${creatorCities.map((c: string) => `"${c}"`).join(',')}))`
        )
      }

      // Get brands
      const { data: brands, error: brandsError } = await brandsQuery

      if (brandsError || !brands) {
        throw new Error('Failed to fetch brands')
      }

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
              name: brand.display_name,
              instagram: brand.instagram_handle,
              website: brand.website_url,
              industry: brand.industry,
              pr_email: brand.pr_email,
              typical_budget: brand.typical_budget_range,
              response_rate: brand.response_rate
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
    // Map database fields to enhanced brand schema expected by matching algorithm
    return {
      id: dbBrand.id,
      name: dbBrand.display_name,
      industry: dbBrand.industry,
      instagramHandle: dbBrand.instagram_handle,
      website: dbBrand.website_url,
      
      values: {
        coreValues: dbBrand.brand_values || [],
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
            countries: dbBrand.ships_to_countries || [],
            cities: dbBrand.ships_to_cities || [],
            shipsToCities: dbBrand.ships_to_cities || []
          }
        },
        niches: [dbBrand.industry.toLowerCase()],
        contentFormats: dbBrand.content_formats || ['posts', 'reels', 'stories'],
        aesthetics: [],
        engagementRate: {
          min: 2,
          preferred: 4
        }
      },
      
      campaigns: {
        budgetRange: dbBrand.typical_budget_range || { min: 500, max: 5000 },
        contentRequirements: {
          approvalsNeeded: 2,
          usageRights: '6 months',
          exclusivity: false
        }
      },
      
      contacts: {
        primary: {
          email: dbBrand.pr_email,
          preferredChannel: dbBrand.preferred_contact_method || 'email'
        }
      },
      
      positioning: {
        marketSegment: this.inferMarketSegment(dbBrand.typical_budget_range),
        pricePoint: this.inferPricePoint(dbBrand.typical_budget_range),
        brandPersonality: []
      },
      
      history: {
        preferredCreatorSize: dbBrand.preferred_creator_size?.[0] || 'micro',
        successMetrics: {
          avgEngagementRate: 3.5,
          avgROI: null
        }
      },
      
      intelligence: {
        upcomingCampaigns: [],
        lastCampaignDate: dbBrand.last_campaign_date
      },
      
      automation: {
        decisionMakerActive: true,
        bestOutreachTimes: ['Tuesday 10AM', 'Thursday 2PM']
      }
    }
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