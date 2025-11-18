/**
 * Rate Limiting Middleware
 *
 * Wraps API route handlers to enforce rate limits
 * Returns 429 Too Many Requests if limit exceeded
 *
 * Usage:
 *
 * import { withRateLimit } from '@/lib/rate-limiting/middleware'
 *
 * export const POST = withRateLimit({
 *   endpoint: '/api/ai/generate-content-plan'
 * })(async (request: NextRequest, userId: string) => {
 *   // Your handler code
 *   return NextResponse.json({ success: true })
 * })
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from './rate-limiter'
import { createServerClient } from '@supabase/ssr'

export interface RateLimitOptions {
  endpoint: string
  cost?: number // Optional override for request cost
}

export type RateLimitedHandler = (
  request: NextRequest,
  userId: string
) => Promise<NextResponse>

/**
 * Rate limiting middleware wrapper
 *
 * Checks rate limits before allowing request through
 * Automatically adds rate limit headers to response
 */
export function withRateLimit(options: RateLimitOptions) {
  return function (handler: RateLimitedHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      // Get user ID from auth
      const userId = await getUserId(request)

      if (!userId) {
        // No user ID = not authenticated
        // Return 401 Unauthorized
        return NextResponse.json(
          { error: 'Authentication required for rate limiting' },
          { status: 401 }
        )
      }

      // Extract request metadata
      const ipAddress = request.ip || request.headers.get('x-forwarded-for') || undefined
      const userAgent = request.headers.get('user-agent') || undefined

      // Check rate limit
      const result = await RateLimiter.checkRateLimit(userId, options.endpoint, {
        ipAddress,
        userAgent,
        cost: options.cost
      })

      // If denied, return 429 with retry info
      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: result.retryAfter,
            resetAt: result.resetAt
          },
          {
            status: 429,
            headers: {
              'Retry-After': result.retryAfter?.toString() || '60',
              'X-RateLimit-Limit': result.limit.capacity.toString(),
              'X-RateLimit-Remaining': result.tokensRemaining.toString(),
              'X-RateLimit-Reset': result.resetAt?.toISOString() || ''
            }
          }
        )
      }

      // Allow request - call handler
      const response = await handler(request, userId)

      // Add rate limit headers to successful response
      response.headers.set('X-RateLimit-Limit', result.limit.capacity.toString())
      response.headers.set('X-RateLimit-Remaining', Math.floor(result.tokensRemaining).toString())
      if (result.resetAt) {
        response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString())
      }

      return response
    }
  }
}

/**
 * Extract user ID from authenticated request
 * Uses Supabase auth session
 */
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    // Create Supabase client from request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {}
        }
      }
    )

    // Get session
    const { data: { session } } = await supabase.auth.getSession()

    return session?.user?.id || null
  } catch (error) {
    console.error('Error getting user ID for rate limiting:', error)
    return null
  }
}

/**
 * Helper to get current rate limit status without consuming tokens
 */
export async function getRateLimitStatus(
  request: NextRequest,
  endpoint: string
): Promise<NextResponse> {
  const userId = await getUserId(request)

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const status = await RateLimiter.getStatus(userId, endpoint)

  return NextResponse.json({
    endpoint,
    tokensAvailable: status.tokensAvailable,
    capacity: status.capacity,
    resetAt: status.resetAt
  })
}
