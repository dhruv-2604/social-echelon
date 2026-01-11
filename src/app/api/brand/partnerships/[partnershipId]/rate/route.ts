import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { getPartnership, ratePartnership } from '@/lib/partnerships'
import { z } from 'zod'

const RatingSchema = z.object({
  rating: z.number().min(1).max(5)
})

/**
 * POST /api/brand/partnerships/[partnershipId]/rate
 * Brand rates the creator
 *
 * This updates creator_rating (brand's rating of the creator)
 */
export const POST = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const rateIndex = pathParts.findIndex(p => p === 'rate')
        const partnershipId = pathParts[rateIndex - 1]

        if (!partnershipId) {
          return NextResponse.json(
            { error: 'Partnership ID is required' },
            { status: 400 }
          )
        }

        // Verify ownership
        const partnership = await getPartnership(partnershipId)
        if (!partnership) {
          return NextResponse.json(
            { error: 'Partnership not found' },
            { status: 404 }
          )
        }

        if (partnership.brandUserId !== userId) {
          return NextResponse.json(
            { error: 'Not authorized to rate this partnership' },
            { status: 403 }
          )
        }

        // Only allow rating after content submission
        if (!['content_pending', 'review', 'completed'].includes(partnership.status)) {
          return NextResponse.json(
            { error: 'Can only rate creators after content submission' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = RatingSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid rating. Must be a number between 1 and 5.' },
            { status: 400 }
          )
        }

        // Brand rates the creator → creator_rating
        const result = await ratePartnership(
          partnershipId,
          'creator', // This sets creator_rating (brand's rating of creator)
          validation.data.rating
        )

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Creator rating submitted'
        })

      } catch (error) {
        console.error('Rating error:', error)
        return NextResponse.json(
          { error: 'Failed to submit rating' },
          { status: 500 }
        )
      }
    }
  )
)
