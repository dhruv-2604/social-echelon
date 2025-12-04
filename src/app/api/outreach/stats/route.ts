/**
 * Outreach Stats API
 *
 * GET /api/outreach/stats
 * Returns outreach statistics for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getEmailOutreachService } from '@/lib/outreach/email-service'

export const dynamic = 'force-dynamic'

export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const emailService = getEmailOutreachService()
      const stats = await emailService.getOutreachStats(userId)

      return NextResponse.json({
        success: true,
        stats
      })
    } catch (error) {
      console.error('Get outreach stats error:', error)
      return NextResponse.json(
        { error: 'Failed to get outreach stats' },
        { status: 500 }
      )
    }
  })
)
