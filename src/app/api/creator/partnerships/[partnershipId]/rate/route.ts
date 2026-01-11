import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { getPartnership, ratePartnership } from '@/lib/partnerships'
import { z } from 'zod'

const RatingSchema = z.object({
  rating: z.number().min(1).max(5)
})

/**
 * POST /api/creator/partnerships/[partnershipId]/rate
 * Creator rates the brand experience
 *
 * This updates brand_rating (creator's rating of the brand)
 */
export const POST = withSecurityHeaders(
  requireUserType('creator')(
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

        if (partnership.creatorUserId !== userId) {
          return NextResponse.json(
            { error: 'Not authorized to rate this partnership' },
            { status: 403 }
          )
        }

        // Only allow rating after partnership is completed or in review
        if (!['review', 'completed'].includes(partnership.status)) {
          return NextResponse.json(
            { error: 'Can only rate partnerships after content submission' },
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

        // Creator rates the brand experience → brand_rating
        const result = await ratePartnership(
          partnershipId,
          'brand', // This sets brand_rating (creator's rating of brand)
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
          message: 'Thank you for your feedback!'
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
