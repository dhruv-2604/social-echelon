import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnershipWithDetails,
  getPartnershipHealth,
  getPartnership,
  updatePartnershipStatus,
  updateDeliverables,
  type Deliverable,
  type PartnershipStatus
} from '@/lib/partnerships'
import { z } from 'zod'

const UpdatePartnershipSchema = z.object({
  status: z.enum(['negotiating', 'active', 'content_pending', 'review', 'completed', 'cancelled']).optional(),
  agreedRate: z.number().min(0).optional(),
  deliverables: z.array(z.object({
    id: z.string(),
    type: z.enum(['post', 'story', 'reel', 'ugc', 'other']),
    description: z.string().optional(),
    quantity: z.number().min(1),
    completed: z.number().min(0),
    dueDate: z.string().optional()
  })).optional(),
  wellnessNotes: z.string().optional()
})

/**
 * GET /api/brand/partnerships/[partnershipId]
 * Fetch a single partnership with full details
 */
export const GET = withSecurityHeaders(
  requireUserType('brand')(
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

        // Verify the brand owns this partnership
        if (partnership.brandUserId !== userId) {
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
          creatorRating: partnership.creatorRating,
          wellnessNotes: partnership.wellnessNotes,
          createdAt: partnership.createdAt,
          updatedAt: partnership.updatedAt,
          creator: partnership.creator ? {
            id: partnership.creator.id,
            name: partnership.creator.fullName,
            instagramUsername: partnership.creator.instagramUsername,
            profilePictureUrl: partnership.creator.profilePictureUrl,
            email: partnership.creator.email
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

/**
 * PATCH /api/brand/partnerships/[partnershipId]
 * Update partnership details (status, rate, deliverables)
 */
export const PATCH = withSecurityHeaders(
  requireUserType('brand')(
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

        const body = await request.json()
        const validation = UpdatePartnershipSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid update data', details: validation.error.errors },
            { status: 400 }
          )
        }

        const updates = validation.data
        const results: string[] = []

        // Update status if provided
        if (updates.status) {
          const statusResult = await updatePartnershipStatus(
            partnershipId,
            updates.status as PartnershipStatus,
            { wellnessNotes: updates.wellnessNotes }
          )
          if (!statusResult.success) {
            return NextResponse.json(
              { error: statusResult.error },
              { status: 400 }
            )
          }
          results.push('status updated')
        }

        // Update deliverables if provided
        if (updates.deliverables) {
          const deliverableResult = await updateDeliverables(
            partnershipId,
            updates.deliverables as Deliverable[]
          )
          if (!deliverableResult.success) {
            return NextResponse.json(
              { error: deliverableResult.error },
              { status: 400 }
            )
          }
          results.push('deliverables updated')
        }

        // Update agreed rate if provided (during negotiation only)
        if (updates.agreedRate !== undefined) {
          if (partnership.status !== 'negotiating') {
            return NextResponse.json(
              { error: 'Can only update rate during negotiation' },
              { status: 400 }
            )
          }

          const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
          const supabase = getSupabaseAdmin()
          await supabase
            .from('partnerships')
            .update({
              agreed_rate: updates.agreedRate,
              updated_at: new Date().toISOString()
            })
            .eq('id', partnershipId)

          results.push('rate updated')
        }

        return NextResponse.json({
          success: true,
          message: results.length > 0 ? results.join(', ') : 'No changes made'
        })

      } catch (error) {
        console.error('Partnership update error:', error)
        return NextResponse.json(
          { error: 'Failed to update partnership' },
          { status: 500 }
        )
      }
    }
  )
)
