/**
 * Follow-ups API
 *
 * POST /api/outreach/follow-ups - Process all due follow-ups (cron/admin)
 * GET /api/outreach/follow-ups - Get user's pending follow-ups
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getFollowUpService } from '@/lib/outreach/follow-up-service'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// System user for cron jobs
const SYSTEM_USER_ID = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'

// GET: User's pending follow-ups
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const followUpService = getFollowUpService()
      const pending = await followUpService.getUserPendingFollowUps(userId)

      return NextResponse.json({
        success: true,
        ...pending
      })
    } catch (error) {
      console.error('Get follow-ups error:', error)
      return NextResponse.json(
        { error: 'Failed to get follow-ups' },
        { status: 500 }
      )
    }
  })
)

// POST: Process due follow-ups (admin/cron only)
export const POST = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Check if user is admin or system user
      const supabase = getSupabaseAdmin()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'admin' && userId !== SYSTEM_USER_ID) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        )
      }

      const followUpService = getFollowUpService()
      const result = await followUpService.processAllDueFollowUps()

      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} follow-ups`,
        ...result
      })
    } catch (error) {
      console.error('Process follow-ups error:', error)
      return NextResponse.json(
        { error: 'Failed to process follow-ups' },
        { status: 500 }
      )
    }
  })
)
