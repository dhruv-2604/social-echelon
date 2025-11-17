/**
 * Rate Limiting Configuration
 *
 * Defines rate limits for each endpoint
 *
 * Philosophy:
 * - Generous limits for normal usage
 * - Strict limits for expensive operations
 * - Allows bursts, smooths to steady rate
 */

import { TokenBucketConfig } from './token-bucket'

export interface RateLimitConfig extends TokenBucketConfig {
  endpoint: string
  description?: string
}

/**
 * Rate limit configurations by endpoint
 *
 * Format:
 * - capacity: Max requests in burst
 * - refillRate: Requests per second steady-state
 * - Example: capacity=10, refillRate=1 means:
 *   - Can make 10 requests instantly
 *   - Then 1 request per second
 *   - Or 60 per minute, 3600 per hour
 */
export const RATE_LIMITS: RateLimitConfig[] = [
  // AI Content Generation (expensive - OpenAI API)
  {
    endpoint: '/api/ai/generate-content-plan',
    capacity: 5,        // 5 immediate generations
    refillRate: 0.1,    // Then 1 every 10 seconds (6/hour)
    description: 'AI content plan generation'
  },

  // Trend Collection (expensive - Apify API)
  {
    endpoint: '/api/trends/collect',
    capacity: 3,
    refillRate: 0.05,   // 1 every 20 seconds (3/hour)
    description: 'Manual trend collection'
  },

  // Intelligence Analysis (expensive - complex queries)
  {
    endpoint: '/api/intelligence/analyze',
    capacity: 5,
    refillRate: 0.2,    // 1 every 5 seconds (12/hour)
    description: 'User intelligence analysis'
  },

  // Brand Matching (moderate cost)
  {
    endpoint: '/api/brand-matching/matches',
    capacity: 10,
    refillRate: 1,      // 1 per second (3600/hour)
    description: 'Brand match calculation'
  },

  // Algorithm Detection (read-only, moderate)
  {
    endpoint: '/api/algorithm/detect',
    capacity: 20,
    refillRate: 2,      // 2 per second (7200/hour)
    description: 'Algorithm change detection'
  },

  // Algorithm Metrics (read-only, cheap)
  {
    endpoint: '/api/algorithm/metrics',
    capacity: 30,
    refillRate: 5,      // 5 per second (18000/hour)
    description: 'Algorithm metrics retrieval'
  },

  // Trend Reading (read-only, cheap)
  {
    endpoint: '/api/trends/instagram',
    capacity: 30,
    refillRate: 5,
    description: 'Instagram trends reading'
  },

  // User Preferences (read/write, cheap)
  {
    endpoint: '/api/user/preferences',
    capacity: 20,
    refillRate: 2,
    description: 'User preferences management'
  },

  // Profile Updates (write, moderate)
  {
    endpoint: '/api/user/profile',
    capacity: 10,
    refillRate: 1,
    description: 'Profile updates'
  },

  // Instagram OAuth (external API, strict)
  {
    endpoint: '/api/auth/instagram',
    capacity: 5,
    refillRate: 0.1,    // 1 every 10 seconds
    description: 'Instagram OAuth flow'
  }
]

/**
 * Default rate limit for endpoints not explicitly configured
 * Generous but prevents abuse
 */
export const DEFAULT_RATE_LIMIT: TokenBucketConfig = {
  capacity: 100,      // 100 requests in burst
  refillRate: 10      // 10 per second (36000/hour)
}

/**
 * Find rate limit config for endpoint
 */
export function getRateLimitConfig(endpoint: string): TokenBucketConfig {
  // Exact match
  const exactMatch = RATE_LIMITS.find(limit => limit.endpoint === endpoint)
  if (exactMatch) {
    return exactMatch
  }

  // Pattern match (e.g., /api/trends/* matches /api/trends/instagram)
  const patternMatch = RATE_LIMITS.find(limit => {
    const pattern = limit.endpoint.replace('*', '.*')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(endpoint)
  })

  if (patternMatch) {
    return patternMatch
  }

  // Default
  return DEFAULT_RATE_LIMIT
}

/**
 * Calculate cost for different operations
 * Some operations consume more tokens than others
 */
export function getRequestCost(endpoint: string, method: string): number {
  // Expensive write operations
  if (endpoint.includes('/generate') || endpoint.includes('/collect')) {
    return 2  // Double cost
  }

  // Expensive analysis
  if (endpoint.includes('/analyze') || endpoint.includes('/detect')) {
    return 1.5
  }

  // Normal operations
  return 1
}
