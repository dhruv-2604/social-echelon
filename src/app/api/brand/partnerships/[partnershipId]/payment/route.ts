import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { getPartnership, markPaymentSent, completePartnership } from '@/lib/partnerships'

/**
 * POST /api/brand/partnerships/[partnershipId]/payment
 * Brand marks payment as sent
 *
 * Optionally completes the partnership if content has been approved
 */
export const POST = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const paymentIndex = pathParts.findIndex(p => p === 'payment')
        const partnershipId = pathParts[paymentIndex - 1]

        if (!partnershipId) {
          return NextResponse.json(
            { error: 'Partnership ID is required' },
            { status: 400 }
          )
        }

        // Parse optional body
        let completeAfterPayment = false
        let creatorRating: number | undefined
        try {
          const body = await request.json()
          completeAfterPayment = body.completeAfterPayment === true
          if (body.creatorRating !== undefined) {
            if (body.creatorRating < 1 || body.creatorRating > 5) {
              return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
              )
            }
            creatorRating = body.creatorRating
          }
        } catch {
          // No body is fine, defaults will be used
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
            { error: 'Not authorized to update this partnership' },
            { status: 403 }
          )
        }

        // Payment can be marked at various stages (review, active, etc.)
        if (['completed', 'cancelled'].includes(partnership.status)) {
          return NextResponse.json(
            { error: 'Cannot mark payment for completed/cancelled partnership' },
            { status: 400 }
          )
        }

        // Mark payment sent
        const paymentResult = await markPaymentSent(partnershipId)
        if (!paymentResult.success) {
          return NextResponse.json(
            { error: paymentResult.error },
            { status: 400 }
          )
        }

        // Optionally complete the partnership
        if (completeAfterPayment && partnership.contentApprovedAt) {
          const completeResult = await completePartnership(partnershipId, {
            creatorRating
          })
          if (!completeResult.success) {
            // Payment was marked but completion failed
            return NextResponse.json({
              success: true,
              message: 'Payment marked but failed to complete partnership',
              warning: completeResult.error
            })
          }

          return NextResponse.json({
            success: true,
            message: 'Payment sent and partnership completed'
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Payment marked as sent'
        })

      } catch (error) {
        console.error('Payment marking error:', error)
        return NextResponse.json(
          { error: 'Failed to mark payment' },
          { status: 500 }
        )
      }
    }
  )
)
