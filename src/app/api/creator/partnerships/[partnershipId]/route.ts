import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnershipWithDetails,
  getPartnershipHealth
} from '@/lib/partnerships'

/**
 * GET /api/creator/partnerships/[partnershipId]
 * Fetch a single partnership with full details
 */
export const GET = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const partnershipId = pathParts[pathParts.length - 1]

        if (!partnershipId) {
          return NextResponse.json(
            { error: 'Partnership ID is required' },
            { status: 400 }
          )
        }

        const { searchParams } = new URL(request.url)
        const includeHealth = searchParams.get('includeHealth') === 'true'

        // Fetch partnership with details
        const partnership = await getPartnershipWithDetails(partnershipId)

        if (!partnership) {
          return NextResponse.json(
            { error: 'Partnership not found' },
            { status: 404 }
          )
        }

        // Verify the creator owns this partnership
        if (partnership.creatorUserId !== userId) {
          return NextResponse.json(
            { error: 'Not authorized to view this partnership' },
            { status: 403 }
          )
        }

        // Optionally include health metrics
        let health = null
        if (includeHealth) {
          health = await getPartnershipHealth(partnershipId)
        }

        // Format response
        const response = {
          id: partnership.id,
          briefMatchId: partnership.briefMatchId,
          status: partnership.status,
          agreedRate: partnership.agreedRate,
          deliverables: partnership.deliverables,
          contentSubmittedAt: partnership.contentSubmittedAt,
          contentApprovedAt: partnership.contentApprovedAt,
          paymentSentAt: partnership.paymentSentAt,
          completedAt: partnership.completedAt,
          brandRating: partnership.brandRating,
          wellnessNotes: partnership.wellnessNotes,
          createdAt: partnership.createdAt,
          updatedAt: partnership.updatedAt,
          brand: partnership.brand ? {
            id: partnership.brand.id,
            name: partnership.brand.companyName || partnership.brand.fullName,
            logoUrl: partnership.brand.logoUrl,
            email: partnership.brand.email
          } : null,
          briefTitle: partnership.briefTitle,
          health
        }

        return NextResponse.json(response)

      } catch (error) {
        console.error('Partnership fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch partnership' },
          { status: 500 }
        )
      }
    }
  )
)
