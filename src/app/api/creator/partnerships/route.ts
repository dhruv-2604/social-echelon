import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnershipsByUser,
  getUserPartnershipStats,
  type PartnershipStatus
} from '@/lib/partnerships'
import { getRelayByMatchId } from '@/lib/messaging'

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

        // Transform for frontend and fetch relay emails
        const formattedPartnerships = await Promise.all(
          partnerships.map(async (p) => {
            // Fetch relay email if partnership has a brief match
            let relayEmail: string | undefined
            if (p.briefMatchId) {
              const relay = await getRelayByMatchId(p.briefMatchId)
              if (relay) {
                relayEmail = relay.relayEmail
              }
            }

            return {
              id: p.id,
              briefMatchId: p.briefMatchId,
              status: p.status,
              agreedRate: p.agreedRate,
              deliverables: p.deliverables,
              contentSubmittedAt: p.contentSubmittedAt,
              contentApprovedAt: p.contentApprovedAt,
              paymentSentAt: p.paymentSentAt,
              completedAt: p.completedAt,
              brandRating: p.brandRating,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              brand: p.brand ? {
                id: p.brand.id,
                name: p.brand.companyName || p.brand.fullName,
                logoUrl: p.brand.logoUrl,
                email: p.brand.email
              } : null,
              briefTitle: p.briefTitle,
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
