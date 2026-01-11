import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnershipsByUser,
  getUserPartnershipStats,
  type PartnershipStatus
} from '@/lib/partnerships'
import { getRelayByMatchId } from '@/lib/messaging'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface BriefInfo {
  title: string
  campaignType: string[]
}

/**
 * GET /api/creator/partnerships
 * Fetch all partnerships for the authenticated creator
 *
 * Query params:
 * - status: Filter by status (comma-separated for multiple)
 * - limit: Number of results (default: 20)
 * - offset: Pagination offset (default: 0)
 */
export const GET = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        const { searchParams } = new URL(request.url)
        const statusParam = searchParams.get('status')
        const limit = parseInt(searchParams.get('limit') || '20', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const includeStats = searchParams.get('includeStats') === 'true'

        // Parse status filter
        let status: PartnershipStatus | PartnershipStatus[] | undefined
        if (statusParam) {
          const statuses = statusParam.split(',') as PartnershipStatus[]
          status = statuses.length === 1 ? statuses[0] : statuses
        }

        // Fetch partnerships
        const partnerships = await getPartnershipsByUser(userId, 'creator', {
          status,
          limit,
          offset
        })

        // Optionally fetch stats
        let stats = null
        if (includeStats) {
          stats = await getUserPartnershipStats(userId, 'creator')
        }

        const supabase = getSupabaseAdmin()

        // Transform for frontend and fetch relay emails + brand profiles + brief info
        const formattedPartnerships = await Promise.all(
          partnerships.map(async (p) => {
            // Fetch relay email if partnership has a brief match
            let relayEmail: string | undefined
            let briefInfo: BriefInfo | null = null

            if (p.briefMatchId) {
              const relay = await getRelayByMatchId(p.briefMatchId)
              if (relay) {
                relayEmail = relay.relayEmail
              }

              // Fetch brief info including campaign type - two queries for reliability
              const { data: matchData } = await supabase
                .from('brief_matches')
                .select('brief_id')
                .eq('id', p.briefMatchId)
                .single()

              if (matchData?.brief_id) {
                const { data: briefData } = await supabase
                  .from('campaign_briefs')
                  .select('title, campaign_type')
                  .eq('id', matchData.brief_id)
                  .single()

                if (briefData) {
                  const brief = briefData as { title: string; campaign_type: string[] }
                  briefInfo = {
                    title: brief.title,
                    campaignType: brief.campaign_type || []
                  }
                }
              }
            }

            // Fetch brand profile for company name, logo, and other details
            let brandProfile: { company_name: string; logo_url: string | null; website: string | null; industry: string | null } | null = null
            if (p.brand?.id) {
              const { data } = await supabase
                .from('brand_profiles')
                .select('company_name, logo_url, website, industry')
                .eq('user_id', p.brand.id)
                .single()
              brandProfile = data as { company_name: string; logo_url: string | null; website: string | null; industry: string | null } | null
            }

            return {
              id: p.id,
              briefMatchId: p.briefMatchId,
              brandUserId: p.brandUserId,
              creatorUserId: p.creatorUserId,
              status: p.status,
              agreedRate: p.agreedRate,
              deliverables: p.deliverables,
              contentSubmittedAt: p.contentSubmittedAt,
              contentApprovedAt: p.contentApprovedAt,
              paymentSentAt: p.paymentSentAt,
              completedAt: p.completedAt,
              brandRating: p.brandRating,
              creatorRating: p.creatorRating,
              wellnessNotes: p.wellnessNotes,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              brand: p.brand ? {
                companyName: brandProfile?.company_name || p.brand.fullName || 'Brand',
                logoUrl: brandProfile?.logo_url || undefined,
                website: brandProfile?.website || undefined,
                industry: brandProfile?.industry || undefined
              } : null,
              brief: briefInfo || (p.briefTitle ? { title: p.briefTitle, campaignType: [] } : null),
              relayEmail
            }
          })
        )

        return NextResponse.json({
          partnerships: formattedPartnerships,
          stats,
          pagination: {
            limit,
            offset,
            hasMore: partnerships.length === limit
          }
        })

      } catch (error) {
        console.error('Partnerships fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch partnerships' },
          { status: 500 }
        )
      }
    }
  )
)
