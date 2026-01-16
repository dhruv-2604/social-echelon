import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { GOLDEN_MATCH_CONFIG, getMatchTier } from '@/lib/partnership-matching/brief-matcher'

/**
 * GET /api/creator/opportunities
 * Fetch all brief matches for the authenticated creator
 *
 * Query params:
 * - status: 'pending' | 'yes' | 'no' | 'all' (default: 'all')
 * - golden_only: 'true' to only return golden matches (score >= 85%, max 3)
 */
export const GET = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'all'
        const goldenOnly = searchParams.get('golden_only') === 'true'

        // Build query for brief matches
        let query = supabaseAdmin
          .from('brief_matches')
          .select(`
            id,
            brief_id,
            match_score,
            match_reasons,
            creator_response,
            response_at,
            partnership_status,
            created_at
          `)
          .eq('creator_user_id', userId)
          .order('created_at', { ascending: false })

        // Filter by creator response status
        if (status !== 'all') {
          query = query.eq('creator_response', status)
        }

        const { data: matchesData, error: matchError } = await query

        if (matchError) {
          console.error('Error fetching opportunities:', matchError)
          return NextResponse.json(
            { error: 'Failed to fetch opportunities' },
            { status: 500 }
          )
        }

        if (!matchesData || matchesData.length === 0) {
          return NextResponse.json({
            opportunities: [],
            counts: { pending: 0, yes: 0, no: 0, total: 0 }
          })
        }

        // Type the matches
        interface MatchData {
          id: string
          brief_id: string
          match_score: number | null
          match_reasons: Record<string, boolean> | null
          creator_response: string
          response_at: string | null
          partnership_status: string
          created_at: string
        }
        const matches = matchesData as MatchData[]

        // Get unique brief IDs
        const briefIds = [...new Set(matches.map(m => m.brief_id))]

        // Fetch campaign briefs separately
        const { data: briefs, error: briefError } = await supabaseAdmin
          .from('campaign_briefs')
          .select(`
            id,
            title,
            description,
            campaign_type,
            product_name,
            product_description,
            target_niches,
            min_followers,
            max_followers,
            min_engagement_rate,
            budget_min,
            budget_max,
            deadline,
            content_deadline,
            status,
            brand_user_id
          `)
          .in('id', briefIds)

        if (briefError) {
          console.error('Error fetching briefs:', briefError)
        }

        // Create a map of brief_id to brief
        const briefMap: Record<string, {
          id: string
          title: string
          description: string
          campaign_type: string[]
          product_name: string | null
          product_description: string | null
          target_niches: string[]
          min_followers: number | null
          max_followers: number | null
          min_engagement_rate: number | null
          budget_min: number | null
          budget_max: number | null
          deadline: string | null
          content_deadline: string | null
          status: string
          brand_user_id: string
        }> = {}

        if (briefs) {
          for (const briefData of briefs) {
            const brief = briefData as typeof briefMap[string]
            briefMap[brief.id] = brief
          }
        }

        // Get brand info for each match
        const brandUserIds = [...new Set(
          Object.values(briefMap).map(b => b.brand_user_id).filter(Boolean)
        )]

        let brandProfiles: Record<string, { company_name: string; logo_url: string | null; website: string | null; industry: string | null }> = {}

        if (brandUserIds.length > 0) {
          const { data: brands, error: brandError } = await supabaseAdmin
            .from('brand_profiles')
            .select('user_id, company_name, logo_url, website, industry')
            .in('user_id', brandUserIds)

          if (!brandError && brands) {
            for (const brandData of brands) {
              const brand = brandData as {
                user_id: string
                company_name: string
                logo_url: string | null
                website: string | null
                industry: string | null
              }
              brandProfiles[brand.user_id] = {
                company_name: brand.company_name,
                logo_url: brand.logo_url,
                website: brand.website,
                industry: brand.industry
              }
            }
          }
        }

        // Combine matches with brand info
        let opportunities = matches
          .filter(m => {
            // Only include matches where the brief is still active
            const brief = briefMap[m.brief_id]
            return brief?.status === 'active' || m.creator_response !== 'pending'
          })
          .map(match => {
            const brief = briefMap[match.brief_id]
            const brand = brief ? brandProfiles[brief.brand_user_id] : null
            const score = match.match_score || 0
            const matchTier = getMatchTier(score)
            const isGolden = score >= GOLDEN_MATCH_CONFIG.MIN_SCORE

            return {
              id: match.id,
              briefId: match.brief_id,
              matchScore: match.match_score,
              matchTier,
              isGolden,
              matchReasons: match.match_reasons,
              creatorResponse: match.creator_response,
              responseAt: match.response_at,
              partnershipStatus: match.partnership_status,
              createdAt: match.created_at,
              brief: brief ? {
                id: brief.id,
                title: brief.title,
                description: brief.description,
                campaignType: brief.campaign_type,
                productName: brief.product_name,
                productDescription: brief.product_description,
                targetNiches: brief.target_niches,
                minFollowers: brief.min_followers,
                maxFollowers: brief.max_followers,
                minEngagementRate: brief.min_engagement_rate,
                budgetMin: brief.budget_min,
                budgetMax: brief.budget_max,
                deadline: brief.deadline,
                contentDeadline: brief.content_deadline,
                status: brief.status
              } : null,
              brand: brand ? {
                companyName: brand.company_name,
                logoUrl: brand.logo_url,
                website: brand.website,
                industry: brand.industry
              } : null
            }
          })

        // Filter to golden only if requested
        if (goldenOnly) {
          opportunities = opportunities.filter(o => o.isGolden)
        }

        // Count by status for badges
        const counts = {
          pending: matches.filter(m => m.creator_response === 'pending').length,
          yes: matches.filter(m => m.creator_response === 'yes').length,
          no: matches.filter(m => m.creator_response === 'no').length,
          golden: matches.filter(m => (m.match_score || 0) >= GOLDEN_MATCH_CONFIG.MIN_SCORE).length,
          total: matches.length
        }

        return NextResponse.json({
          opportunities,
          counts
        })

      } catch (error) {
        console.error('Opportunities fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch opportunities' },
          { status: 500 }
        )
      }
    }
  )
)
