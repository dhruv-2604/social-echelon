import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import { getPartnership, approveContent } from '@/lib/partnerships'

/**
 * POST /api/brand/partnerships/[partnershipId]/approve
 * Brand approves submitted content
 *
 * This moves the partnership from 'content_pending' to 'review'
 */
export const POST = withSecurityHeaders(
  requireUserType('brand')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const approveIndex = pathParts.findIndex(p => p === 'approve')
        const partnershipId = pathParts[approveIndex - 1]

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
            { error: 'Not authorized to approve this partnership' },
            { status: 403 }
          )
        }

        // Verify content has been submitted
        if (partnership.status !== 'content_pending') {
          return NextResponse.json(
            { error: `Cannot approve content for partnership with status '${partnership.status}'` },
            { status: 400 }
          )
        }

        const result = await approveContent(partnershipId)

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Content approved successfully'
        })

      } catch (error) {
        console.error('Content approval error:', error)
        return NextResponse.json(
          { error: 'Failed to approve content' },
          { status: 500 }
        )
      }
    }
  )
)
