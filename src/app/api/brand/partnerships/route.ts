import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnershipsByUser,
  getUserPartnershipStats,
  type PartnershipStatus
} from '@/lib/partnerships'

/**
 * GET /api/brand/partnerships
 * Fetch all partnerships for the authenticated brand
 *
 * Query params:
 * - status: Filter by status (comma-separated for multiple)
 * - limit: Number of results (default: 20)
 * - offset: Pagination offset (default: 0)
 * - includeStats: Include aggregate stats (default: false)
 */
export const GET = withSecurityHeaders(
  requireUserType('brand')(
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
        const partnerships = await getPartnershipsByUser(userId, 'brand', {
          status,
          limit,
          offset
        })

        // Optionally fetch stats
        let stats = null
        if (includeStats) {
          stats = await getUserPartnershipStats(userId, 'brand')
        }

        // Transform for frontend
        const formattedPartnerships = partnerships.map(p => ({
          id: p.id,
          briefMatchId: p.briefMatchId,
          status: p.status,
          agreedRate: p.agreedRate,
          deliverables: p.deliverables,
          contentSubmittedAt: p.contentSubmittedAt,
          contentApprovedAt: p.contentApprovedAt,
          paymentSentAt: p.paymentSentAt,
          completedAt: p.completedAt,
          creatorRating: p.creatorRating,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          creator: p.creator ? {
            id: p.creator.id,
            name: p.creator.fullName,
            instagramUsername: p.creator.instagramUsername,
            profilePictureUrl: p.creator.profilePictureUrl,
            email: p.creator.email
          } : null,
          briefTitle: p.briefTitle
        }))

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
