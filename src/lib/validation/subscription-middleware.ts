/**
 * Subscription Enforcement Middleware
 *
 * Checks that users have an active subscription before accessing protected features
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

type PlanType = 'balance' | 'harmony'

// Features available per plan
const PLAN_FEATURES = {
  balance: [
    'content_planning',
    'growth_analytics',
    'algorithm_detection',
    'basic_brand_matching',
    'trend_monitoring'
  ],
  harmony: [
    'content_planning',
    'growth_analytics',
    'algorithm_detection',
    'basic_brand_matching',
    'trend_monitoring',
    'advanced_brand_matching',
    'automated_outreach',
    'priority_insights',
    'success_manager'
  ]
}

export type SubscriptionStatus = 'pending_payment' | 'active' | 'cancelled' | 'past_due'

interface SubscriptionInfo {
  status: SubscriptionStatus
  plan: PlanType | null
  expiresAt: Date | null
  hasAccess: boolean
  canUseFeature: (feature: string) => boolean
}

/**
 * Get subscription info for a user
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const supabase = getSupabaseAdmin()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_plan, subscription_expires_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return {
      status: 'pending_payment',
      plan: null,
      expiresAt: null,
      hasAccess: false,
      canUseFeature: () => false
    }
  }

  const p = profile as any
  const status = p.subscription_status as SubscriptionStatus
  const plan = p.subscription_plan as PlanType | null
  const expiresAt = p.subscription_expires_at ? new Date(p.subscription_expires_at) : null

  // Check if subscription is active
  const hasAccess = status === 'active' && plan !== null

  return {
    status,
    plan,
    expiresAt,
    hasAccess,
    canUseFeature: (feature: string) => {
      if (!hasAccess || !plan) return false
      return PLAN_FEATURES[plan].includes(feature)
    }
  }
}

/**
 * Middleware that requires an active subscription
 */
export function requireSubscription(
  handler: (
    request: NextRequest,
    userId: string,
    subscription: SubscriptionInfo,
    context?: any
  ) => Promise<NextResponse>
) {
  return async function subscriptionHandler(
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    try {
      const cookieStore = await cookies()
      const userId = cookieStore.get('user_id')?.value

      if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const subscription = await getSubscriptionInfo(userId)

      if (!subscription.hasAccess) {
        return NextResponse.json(
          {
            error: 'Active subscription required',
            subscriptionStatus: subscription.status,
            redirectTo: subscription.status === 'pending_payment'
              ? '/auth/signup?step=payment'
              : '/settings?tab=billing'
          },
          { status: 403 }
        )
      }

      return await handler(request, userId, subscription, context)
    } catch (error) {
      console.error('Subscription middleware error:', error)
      return NextResponse.json({ error: 'Subscription check failed' }, { status: 500 })
    }
  }
}

/**
 * Middleware that requires a specific feature
 */
export function requireFeature(feature: string) {
  return function featureMiddleware(
    handler: (
      request: NextRequest,
      userId: string,
      subscription: SubscriptionInfo,
      context?: any
    ) => Promise<NextResponse>
  ) {
    return requireSubscription(async (request, userId, subscription, context) => {
      if (!subscription.canUseFeature(feature)) {
        return NextResponse.json(
          {
            error: `This feature requires a higher plan`,
            feature,
            currentPlan: subscription.plan,
            requiredPlan: 'harmony',
            upgradeUrl: '/settings?tab=billing&upgrade=true'
          },
          { status: 403 }
        )
      }

      return await handler(request, userId, subscription, context)
    })
  }
}

/**
 * Check subscription in a page (client-side helper)
 */
export async function checkSubscriptionClient(): Promise<{
  hasAccess: boolean
  status: string
  plan: string | null
}> {
  try {
    const response = await fetch('/api/user/subscription')
    if (!response.ok) {
      return { hasAccess: false, status: 'unknown', plan: null }
    }
    return await response.json()
  } catch {
    return { hasAccess: false, status: 'error', plan: null }
  }
}
