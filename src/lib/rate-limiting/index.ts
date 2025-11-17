/**
 * Rate Limiting System
 *
 * Token bucket rate limiting for authenticated users
 *
 * Usage:
 *
 * import { RateLimiter } from '@/lib/rate-limiting'
 *
 * const result = await RateLimiter.checkRateLimit(userId, endpoint)
 *
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': result.retryAfter?.toString() || '60',
 *         'X-RateLimit-Limit': result.limit.capacity.toString(),
 *         'X-RateLimit-Remaining': result.tokensRemaining.toString(),
 *         'X-RateLimit-Reset': result.resetAt?.toISOString() || ''
 *       }
 *     }
 *   )
 * }
 */

export { RateLimiter } from './rate-limiter'
export { TokenBucket } from './token-bucket'
export { getRateLimitConfig, RATE_LIMITS, DEFAULT_RATE_LIMIT } from './config'

export type { RateLimitCheckResult } from './rate-limiter'
export type { TokenBucketConfig, TokenBucketState, TokenBucketResult } from './token-bucket'
export type { RateLimitConfig } from './config'
