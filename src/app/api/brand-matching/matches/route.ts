import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { BrandMatchingEngine } from '@/lib/brand-matching/matching-algorithm'
import { CreatorProfile } from '@/lib/brand-matching/creator-profile-schema'
import { EnhancedBrand } from '@/lib/brand-matching/enhanced-brand-schema'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get creator profile
    const { data: creatorProfileData, error: profileError } = await supabaseAdmin
      .from('creator_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (profileError || !creatorProfileData) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const creatorProfile = creatorProfileData.profile_data as CreatorProfile

    // Check for existing matches first
    const { data: existingMatches, error: matchError } = await supabaseAdmin
      .from('brand_matches')
      .select(`
        *,
        brand:brands(*)
      `)
      .eq('profile_id', userId)
      .order('match_score', { ascending: false })

    // If we have recent matches (less than 7 days old), return them
    if (existingMatches && existingMatches.length > 0) {
      const recentMatches = existingMatches.filter(match => {
        const matchDate = new Date(match.created_at)
        const daysSinceMatch = (Date.now() - matchDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceMatch < 7
      })

      if (recentMatches.length > 0) {
        const formattedMatches = recentMatches.map(match => ({
          id: match.id,
          brand: match.brand,
          overallScore: match.match_score,
          matchCategory: match.match_category,
          scores: {
            valuesAlignment: match.values_alignment_score * 100,
            audienceResonance: match.audience_resonance_score * 100,
            contentStyleMatch: match.content_style_match_score * 100,
            successProbability: match.success_probability_score * 100
          },
          insights: match.insights || {},
          financials: {
            suggestedRate: match.suggested_rate,
            marketRate: match.market_rate,
            negotiationRoom: match.match_breakdown?.negotiationRoom || 'Standard negotiation expected'
          },
          status: match.status,
          lastStatusUpdate: match.last_status_update
        }))

        return NextResponse.json({ matches: formattedMatches })
      }
    }

    // Generate new matches
    const { data: brands, error: brandsError } = await supabaseAdmin
      .from('brands')
      .select('*')
      .eq('verified', true)

    if (brandsError || !brands) {
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    // Transform database brands to EnhancedBrand format
    const enhancedBrands: EnhancedBrand[] = brands.map(brand => ({
      id: brand.id,
      name: brand.name,
      website: brand.website || '',
      instagramHandle: brand.instagram_handle || '',
      industry: brand.industry || '',
      subIndustry: brand.sub_industry || '',
      logoUrl: brand.logo_url,
      description: brand.description || '',
      contacts: {
        primary: {
          name: brand.contact_name || '',
          role: brand.contact_role || '',
          email: brand.contact_email || '',
          preferredChannel: brand.preferred_contact_channel || 'email',
          responseTime: brand.response_time_hours || 48
        }
      },
      targeting: {
        followerRange: {
          min: brand.target_follower_min || 0,
          max: brand.target_follower_max || 1000000
        },
        engagementRate: {
          min: brand.target_engagement_min || 0,
          preferred: brand.target_engagement_min ? brand.target_engagement_min + 2 : 3
        },
        niches: brand.target_niches || [],
        contentFormats: brand.content_types || [],
        aesthetics: brand.aesthetic_keywords || [],
        audienceDemographics: brand.audience_demographics || {}
      },
      values: {
        coreValues: brand.brand_values || [],
        esgRating: brand.esg_rating,
        controversyHistory: brand.controversy_history || { hasControversies: false },
        employeeSatisfaction: brand.employee_satisfaction,
        supplyChainEthics: brand.supply_chain_ethics
      },
      campaigns: {
        types: brand.campaign_types || [],
        budgetRange: {
          min: brand.budget_min || 0,
          max: brand.budget_max || 10000,
          currency: 'USD'
        },
        paymentTerms: brand.payment_terms || 'Net 30',
        typicalDuration: brand.typical_campaign_duration || 'one-off',
        exclusivityRequired: brand.exclusivity_required || false,
        rightsRequested: [],
        contentRequirements: {
          approvalsNeeded: brand.content_approval_rounds || 1,
          revisionsIncluded: brand.revisions_included || 2,
          turnaroundExpectation: brand.turnaround_expectation || 7
        }
      },
      history: {
        pastInfluencers: [],
        successMetrics: {
          avgEngagementRate: 0,
          repeatCollaborationRate: 0
        },
        preferredCreatorSize: brand.past_influencer_size || 'micro'
      },
      intelligence: {
        discoverySource: 'manual',
        upcomingCampaigns: brand.upcoming_campaigns || [],
        competitorInfluencers: brand.competitor_influencers || [],
        marketPosition: brand.market_position || 'niche',
        growthTrajectory: brand.growth_trajectory || 'steady'
      },
      automation: {
        outreachEnabled: brand.outreach_enabled !== false,
        warmupRequired: brand.warmup_required || false,
        bestOutreachTimes: brand.best_outreach_times || ['Tuesday 10AM'],
        avoidDates: brand.avoid_dates || [],
        personalizedAngles: brand.personalized_angles || [],
        decisionMakerActive: true
      },
      verified: brand.verified || false,
      verificationDate: brand.verification_date,
      lastUpdated: brand.last_updated || new Date(),
      createdAt: brand.created_at,
      dataCompleteness: brand.data_completeness || 50
    }))

    // Calculate matches
    const matchingEngine = new BrandMatchingEngine()
    const matches = enhancedBrands.map(brand => 
      matchingEngine.calculateMatch(creatorProfile, brand)
    )

    // Sort by score and filter out poor matches
    const goodMatches = matches
      .filter(match => match.overallScore >= 50)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 20) // Top 20 matches

    // Save matches to database
    for (const match of goodMatches) {
      await supabaseAdmin
        .from('brand_matches')
        .upsert({
          profile_id: userId,
          brand_id: match.brandId,
          match_score: match.overallScore,
          match_category: match.matchCategory,
          values_alignment_score: match.scores.valuesAlignment.score / 100,
          audience_resonance_score: match.scores.audienceResonance.score / 100,
          content_style_match_score: match.scores.contentStyleMatch.score / 100,
          success_probability_score: match.scores.successProbability.score / 100,
          match_breakdown: match.scores,
          insights: match.insights,
          suggested_rate: match.financials.suggestedRate,
          market_rate: match.financials.marketRate,
          estimated_response_rate: match.insights.estimatedResponseRate,
          outreach_strategy: match.outreachStrategy,
          status: 'pending',
          reasons: [
            ...match.scores.valuesAlignment.details,
            ...match.scores.contentStyleMatch.matchingElements,
            ...match.scores.successProbability.factors
          ],
          created_at: new Date().toISOString(),
          last_status_update: new Date().toISOString()
        })
    }

    // Format matches for response
    const formattedMatches = goodMatches.map(match => {
      const brand = enhancedBrands.find(b => b.id === match.brandId)!
      return {
        id: match.id,
        brand: {
          id: brand.id,
          name: brand.name,
          logo_url: brand.logoUrl,
          instagram_handle: brand.instagramHandle,
          website: brand.website,
          industry: brand.industry,
          description: brand.description,
          budget_range: brand.campaigns.budgetRange,
          verified: brand.verified
        },
        overallScore: match.overallScore,
        matchCategory: match.matchCategory,
        scores: {
          valuesAlignment: match.scores.valuesAlignment.score,
          audienceResonance: match.scores.audienceResonance.score,
          contentStyleMatch: match.scores.contentStyleMatch.score,
          successProbability: match.scores.successProbability.score
        },
        insights: match.insights,
        financials: match.financials,
        status: match.status,
        lastStatusUpdate: match.lastStatusUpdate
      }
    })

    return NextResponse.json({ matches: formattedMatches })

  } catch (error) {
    console.error('Error fetching brand matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    )
  }
}