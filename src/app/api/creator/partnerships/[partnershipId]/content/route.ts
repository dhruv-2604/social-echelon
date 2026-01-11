import { NextRequest, NextResponse } from 'next/server'
import { requireUserType, withSecurityHeaders } from '@/lib/validation/middleware'
import {
  getPartnership,
  submitContent,
  markDeliverableComplete,
  updateDeliverables,
  type Deliverable
} from '@/lib/partnerships'
import { z } from 'zod'

const SubmitContentSchema = z.object({
  deliverableId: z.string().optional(),
  completedCount: z.number().min(0).optional(),
  submitAll: z.boolean().optional()
})

const UpdateDeliverablesSchema = z.object({
  deliverables: z.array(z.object({
    id: z.string(),
    type: z.enum(['post', 'story', 'reel', 'ugc', 'other']),
    description: z.string().optional(),
    quantity: z.number().min(1),
    completed: z.number().min(0),
    dueDate: z.string().optional()
  }))
})

/**
 * POST /api/creator/partnerships/[partnershipId]/content
 * Submit content for a partnership
 *
 * Actions:
 * - Mark a specific deliverable as complete
 * - Submit all content (moves partnership to content_pending)
 */
export const POST = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const contentIndex = pathParts.findIndex(p => p === 'content')
        const partnershipId = pathParts[contentIndex - 1]

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
            { error: 'Not authorized to update this partnership' },
            { status: 403 }
          )
        }

        // Check status allows content submission
        if (!['active', 'content_pending'].includes(partnership.status)) {
          return NextResponse.json(
            { error: `Cannot submit content for partnership with status '${partnership.status}'` },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = SubmitContentSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid request data', details: validation.error.errors },
            { status: 400 }
          )
        }

        const { deliverableId, completedCount, submitAll } = validation.data

        // Handle specific deliverable completion
        if (deliverableId) {
          const result = await markDeliverableComplete(
            partnershipId,
            deliverableId,
            completedCount
          )

          if (!result.success) {
            return NextResponse.json(
              { error: result.error },
              { status: 400 }
            )
          }

          return NextResponse.json({
            success: true,
            message: 'Deliverable updated'
          })
        }

        // Handle full content submission
        if (submitAll) {
          const result = await submitContent(partnershipId)

          if (!result.success) {
            return NextResponse.json(
              { error: result.error },
              { status: 400 }
            )
          }

          return NextResponse.json({
            success: true,
            message: 'Content submitted for review'
          })
        }

        return NextResponse.json(
          { error: 'Must specify deliverableId or submitAll' },
          { status: 400 }
        )

      } catch (error) {
        console.error('Content submission error:', error)
        return NextResponse.json(
          { error: 'Failed to submit content' },
          { status: 500 }
        )
      }
    }
  )
)

/**
 * PUT /api/creator/partnerships/[partnershipId]/content
 * Update deliverables for a partnership (during negotiation)
 */
export const PUT = withSecurityHeaders(
  requireUserType('creator')(
    async (request: NextRequest, userId: string) => {
      try {
        // Extract partnershipId from URL
        const url = new URL(request.url)
        const pathParts = url.pathname.split('/')
        const contentIndex = pathParts.findIndex(p => p === 'content')
        const partnershipId = pathParts[contentIndex - 1]

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
            { error: 'Not authorized to update this partnership' },
            { status: 403 }
          )
        }

        // Only allow during negotiation or active phase
        if (!['negotiating', 'active'].includes(partnership.status)) {
          return NextResponse.json(
            { error: 'Cannot update deliverables at this stage' },
            { status: 400 }
          )
        }

        const body = await request.json()
        const validation = UpdateDeliverablesSchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { error: 'Invalid deliverables data', details: validation.error.errors },
            { status: 400 }
          )
        }

        const result = await updateDeliverables(
          partnershipId,
          validation.data.deliverables as Deliverable[]
        )

        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Deliverables updated'
        })

      } catch (error) {
        console.error('Deliverables update error:', error)
        return NextResponse.json(
          { error: 'Failed to update deliverables' },
          { status: 500 }
        )
      }
    }
  )
)
