/**
 * Token Bucket Rate Limiting Algorithm
 *
 * Elegant, forgiving rate limiting that allows bursts while maintaining steady-state limits.
 *
 * How it works:
 * - Bucket holds tokens (capacity)
 * - Tokens refill at steady rate (refillRate per second)
 * - Request consumes tokens (cost)
 * - If not enough tokens = deny request
 *
 * Benefits over simple counters:
 * - Allows bursts (use all tokens quickly)
 * - Smooths to steady rate over time
 * - Feels responsive, not restrictive
 */

export interface TokenBucketConfig {
  capacity: number      // Max tokens bucket can hold
  refillRate: number   // Tokens added per second
  cost?: number        // Tokens consumed per request (default: 1)
}

export interface TokenBucketState {
  tokensRemaining: number
  lastRefillAt: Date
}

export interface TokenBucketResult {
  allowed: boolean
  tokensRemaining: number
  retryAfter?: number  // Seconds to wait if denied
  resetAt?: Date       // When bucket will be full again
}

/**
 * Token Bucket Rate Limiter
 *
 * Pure function implementation - no side effects
 * Database updates handled by caller
 */
export class TokenBucket {
  private capacity: number
  private refillRate: number
  private cost: number

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity
    this.refillRate = config.refillRate
    this.cost = config.cost || 1

    // Validation
    if (this.capacity <= 0) {
      throw new Error('Token bucket capacity must be positive')
    }
    if (this.refillRate <= 0) {
      throw new Error('Token bucket refill rate must be positive')
    }
    if (this.cost <= 0) {
      throw new Error('Token bucket cost must be positive')
    }
  }

  /**
   * Calculate current tokens based on time elapsed since last refill
   */
  private calculateCurrentTokens(state: TokenBucketState, now: Date = new Date()): number {
    const secondsElapsed = (now.getTime() - state.lastRefillAt.getTime()) / 1000
    const tokensToAdd = secondsElapsed * this.refillRate
    const currentTokens = Math.min(
      this.capacity,
      state.tokensRemaining + tokensToAdd
    )

    return currentTokens
  }

  /**
   * Check if request should be allowed and calculate new state
   *
   * @param currentState - Current bucket state from database
   * @param now - Current time (injected for testing)
   * @returns Result with allowed status and new token count
   */
  public consume(
    currentState: TokenBucketState,
    now: Date = new Date()
  ): TokenBucketResult {
    // Calculate current tokens (with refill)
    const currentTokens = this.calculateCurrentTokens(currentState, now)

    // Check if we have enough tokens
    if (currentTokens >= this.cost) {
      // Allow request - consume tokens
      const tokensRemaining = currentTokens - this.cost

      return {
        allowed: true,
        tokensRemaining,
        resetAt: this.calculateResetTime(tokensRemaining, now)
      }
    } else {
      // Deny request - not enough tokens
      const tokensNeeded = this.cost - currentTokens
      const retryAfter = Math.ceil(tokensNeeded / this.refillRate)

      return {
        allowed: false,
        tokensRemaining: currentTokens,
        retryAfter,
        resetAt: this.calculateResetTime(currentTokens, now)
      }
    }
  }

  /**
   * Calculate when bucket will be full again
   */
  private calculateResetTime(currentTokens: number, now: Date): Date {
    const tokensToFill = this.capacity - currentTokens
    const secondsToFill = tokensToFill / this.refillRate
    const resetTime = new Date(now.getTime() + secondsToFill * 1000)
    return resetTime
  }

  /**
   * Initialize a new bucket (for first request from user)
   */
  public static initialize(config: TokenBucketConfig): TokenBucketState {
    return {
      tokensRemaining: config.capacity, // Start with full bucket
      lastRefillAt: new Date()
    }
  }

  /**
   * Get human-readable description of bucket status
   */
  public describe(state: TokenBucketState): string {
    const currentTokens = this.calculateCurrentTokens(state)
    const percentFull = (currentTokens / this.capacity) * 100

    return `${currentTokens.toFixed(1)}/${this.capacity} tokens (${percentFull.toFixed(0)}% full)`
  }
}

/**
 * Example usage:
 *
 * const bucket = new TokenBucket({
 *   capacity: 10,      // Max 10 requests in burst
 *   refillRate: 1      // Refill 1 token per second (3600/hour)
 * })
 *
 * // Load state from database
 * const state = {
 *   tokensRemaining: 5,
 *   lastRefillAt: new Date('2025-01-15T10:00:00Z')
 * }
 *
 * // Check if request allowed
 * const result = bucket.consume(state)
 *
 * if (result.allowed) {
 *   // Process request
 *   // Update database with result.tokensRemaining
 * } else {
 *   // Deny request
 *   // Return 429 with Retry-After: result.retryAfter
 * }
 */
