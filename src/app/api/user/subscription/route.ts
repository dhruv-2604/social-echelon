/**
 * User Subscription API
 *
 * GET /api/user/subscription - Get current subscription status
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getSubscriptionInfo } from '@/lib/validation/subscription-middleware'

export const dynamic = 'force-dynamic'

export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const subscription = await getSubscriptionInfo(userId)

      return NextResponse.json({
        hasAccess: subscription.hasAccess,
        status: subscription.status,
        plan: subscription.plan,
        expiresAt: subscription.expiresAt?.toISOString() || null
      })
    } catch (error) {
      console.error('Get subscription error:', error)
      return NextResponse.json(
        { error: 'Failed to get subscription status' },
        { status: 500 }
      )
    }
  })
)
