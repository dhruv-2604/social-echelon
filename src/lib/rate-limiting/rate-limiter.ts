/**
 * Rate Limiter Service
 *
 * Integrates token bucket algorithm with Supabase database
 * Handles state persistence and violation logging
 */

import { TokenBucket, TokenBucketState, TokenBucketResult } from './token-bucket'
import { getRateLimitConfig, getRequestCost } from './config'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface RateLimitCheckResult {
  allowed: boolean
  tokensRemaining: number
  retryAfter?: number
  resetAt?: Date
  limit: {
    capacity: number
    refillRate: number
  }
}

/**
 * Rate Limiter Service
 *
 * Main interface for rate limiting in the application
 */
export class RateLimiter {
  /**
   * Check if request should be allowed for user
   *
   * @param userId - User making the request
   * @param endpoint - API endpoint being accessed
   * @param options - Optional parameters
   * @returns Result with allowed status and token info
   */
  static async checkRateLimit(
    userId: string,
    endpoint: string,
    options: {
      ipAddress?: string
      userAgent?: string
      cost?: number
    } = {}
  ): Promise<RateLimitCheckResult> {
    const supabase = getSupabaseAdmin()

    // Get configuration for this endpoint
    const config = getRateLimitConfig(endpoint)
    const cost = options.cost || getRequestCost(endpoint, 'GET')

    // Create token bucket instance
    const bucket = new TokenBucket({
      ...config,
      cost
    })

    // Load current state from database (or initialize if first request)
    const { data: existingLimit } = await supabase
      .from('rate_limits')
      .select('tokens_remaining, last_refill_at')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single()

    let currentState: TokenBucketState

    if (existingLimit) {
      // Existing bucket state
      currentState = {
        tokensRemaining: parseFloat((existingLimit as any).tokens_remaining),
        lastRefillAt: new Date((existingLimit as any).last_refill_at)
      }
    } else {
      // First request - initialize bucket
      currentState = TokenBucket.initialize(config)
    }

    // Check if request allowed
    const result = bucket.consume(currentState)

    // Update database with new state
    if (result.allowed) {
      // Allow request - update tokens
      await supabase
        .from('rate_limits')
        .upsert({
          user_id: userId,
          endpoint,
          tokens_remaining: result.tokensRemaining,
          last_refill_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        })
    } else {
      // Deny request - log violation
      await this.logViolation(userId, endpoint, {
        tokensRequested: cost,
        tokensAvailable: result.tokensRemaining,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      })

      // Still update state to track refill
      await supabase
        .from('rate_limits')
        .upsert({
          user_id: userId,
          endpoint,
          tokens_remaining: result.tokensRemaining,
          last_refill_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        })
    }

    return {
      allowed: result.allowed,
      tokensRemaining: result.tokensRemaining,
      retryAfter: result.retryAfter,
      resetAt: result.resetAt,
      limit: {
        capacity: config.capacity,
        refillRate: config.refillRate
      }
    }
  }

  /**
   * Log rate limit violation for monitoring
   */
  private static async logViolation(
    userId: string,
    endpoint: string,
    details: {
      tokensRequested: number
      tokensAvailable: number
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    await supabase
      .from('rate_limit_violations')
      .insert({
        user_id: userId,
        endpoint,
        tokens_requested: details.tokensRequested,
        tokens_available: details.tokensAvailable,
        ip_address: details.ipAddress || null,
        user_agent: details.userAgent || null
      })
  }

  /**
   * Get current rate limit status for user (without consuming tokens)
   */
  static async getStatus(
    userId: string,
    endpoint: string
  ): Promise<{
    tokensAvailable: number
    capacity: number
    resetAt: Date
  }> {
    const supabase = getSupabaseAdmin()
    const config = getRateLimitConfig(endpoint)
    const bucket = new TokenBucket(config)

    // Load state
    const { data: limit } = await supabase
      .from('rate_limits')
      .select('tokens_remaining, last_refill_at')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .single()

    if (!limit) {
      // No state yet - return full capacity
      return {
        tokensAvailable: config.capacity,
        capacity: config.capacity,
        resetAt: new Date()
      }
    }

    const state: TokenBucketState = {
      tokensRemaining: parseFloat((limit as any).tokens_remaining),
      lastRefillAt: new Date((limit as any).last_refill_at)
    }

    // Calculate current tokens (without consuming)
    const result = bucket.consume(state)

    return {
      tokensAvailable: result.tokensRemaining + (result.allowed ? 1 : 0), // Add back the consumed token
      capacity: config.capacity,
      resetAt: result.resetAt!
    }
  }

  /**
   * Reset rate limit for user (admin function)
   */
  static async reset(userId: string, endpoint?: string): Promise<void> {
    const supabase = getSupabaseAdmin()

    if (endpoint) {
      // Reset specific endpoint
      await supabase
        .from('rate_limits')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
    } else {
      // Reset all endpoints for user
      await supabase
        .from('rate_limits')
        .delete()
        .eq('user_id', userId)
    }
  }

  /**
   * Get violation history for user
   */
  static async getViolations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    const supabase = getSupabaseAdmin()

    const { data } = await supabase
      .from('rate_limit_violations')
      .select('*')
      .eq('user_id', userId)
      .order('violated_at', { ascending: false })
      .limit(limit)

    return data || []
  }
}
