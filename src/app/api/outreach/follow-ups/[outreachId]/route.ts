/**
 * Single Outreach Follow-up Management
 *
 * DELETE /api/outreach/follow-ups/[outreachId] - Cancel follow-ups
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getFollowUpService } from '@/lib/outreach/follow-up-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const ParamsSchema = z.object({
  outreachId: z.string().uuid()
})

// DELETE: Cancel follow-ups for an outreach
export const DELETE = withSecurityHeaders(
  withAuthAndValidation({
    params: ParamsSchema
  })(async (request: NextRequest, userId: string, { validatedParams }) => {
    try {
      const { outreachId } = validatedParams!
      const supabase = getSupabaseAdmin()

      // Verify user owns this outreach
      const { data: outreach, error } = await supabase
        .from('outreach_messages')
        .select('id, user_id')
        .eq('id', outreachId)
        .single()

      if (error || !outreach) {
        return NextResponse.json(
          { error: 'Outreach not found' },
          { status: 404 }
        )
      }

      if ((outreach as any).user_id !== userId) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403 }
        )
      }

      const followUpService = getFollowUpService()
      await followUpService.cancelFollowUps(outreachId)

      return NextResponse.json({
        success: true,
        message: 'Follow-ups cancelled'
      })
    } catch (error) {
      console.error('Cancel follow-ups error:', error)
      return NextResponse.json(
        { error: 'Failed to cancel follow-ups' },
        { status: 500 }
      )
    }
  })
)
