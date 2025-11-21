import { NextRequest, NextResponse } from 'next/server'
import { EnhancedBrandMatchingService } from '@/lib/brand-matching/enhanced-matching-service'
import { withAuthAndValidation, withSecurityHeaders, requireAuth } from '@/lib/validation/middleware'
import { BrandMatchingQuerySchema } from '@/lib/validation/schemas'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { RateLimiter } from '@/lib/rate-limiting'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: BrandMatchingQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    // Rate limit check
    const rateCheck = await RateLimiter.checkRateLimit(
      userId,
      '/api/brand-matching/matches'
    )

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter?.toString() || '60' } }
      )
    }

    try {
      const supabaseAdmin = getSupabaseAdmin()
      const matchingService = new EnhancedBrandMatchingService()

      // Check if user has completed brand matching onboarding
      const { data: profile } = await supabaseAdmin
        .from('creator_profiles')
        .select('profile_data')
        .eq('user_id', userId)
        .single()

      if (!(profile as any)?.profile_data?.identity) {
        return NextResponse.json({ 
          error: 'Brand matching profile not completed',
          requiresOnboarding: true 
        }, { status: 400 })
      }

      // Get matches from the service with validated parameters
      const options = {
        limit: validatedQuery?.limit || 100,
        minScore: validatedQuery?.minScore || 50,
        excludeMatched: validatedQuery?.excludeMatched || false
      }

      const matchData = await matchingService.getMatchesForCreator(userId, options)

    // Get similar brand suggestions based on past collaborations
    const similarBrands = await matchingService.getSimilarBrandMatches(userId)

    // Get user's brand requests
    const brandRequests = await matchingService.getUserRequestedBrands(userId)

    return NextResponse.json({
      success: true,
      matches: matchData.matches,
      stats: matchData.matchStats,
      totalAnalyzed: matchData.totalBrandsAnalyzed,
      similarBrandSuggestions: similarBrands,
      pendingRequests: brandRequests.filter((r: any) => r.status === 'pending').length
    })

  } catch (error) {
    console.error('Error fetching brand matches:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brand matches' },
      { status: 500 }
    )
  }
  })
)

// POST body validation for match recalculation
const MatchRecalculationSchema = z.object({
  force_refresh: z.boolean().default(true),
  clear_existing: z.boolean().default(true)
})

export const POST = withSecurityHeaders(
  withAuthAndValidation({
    body: MatchRecalculationSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const matchingService = new EnhancedBrandMatchingService()

      const clearExisting = validatedBody?.clear_existing ?? true
      const forceRefresh = validatedBody?.force_refresh ?? true

      // Clear existing matches if requested
      if (clearExisting) {
        await supabaseAdmin
          .from('user_brand_matches')
          .delete()
          .eq('user_id', userId)
      }

      // Get fresh matches
      const matchData = await matchingService.getMatchesForCreator(userId, {
        limit: 100,
        minScore: 50,
        excludeMatched: false
      })

      return NextResponse.json({
        success: true,
        message: 'Matches recalculated successfully',
        matches: matchData.matches,
        stats: matchData.matchStats,
        config: {
          cleared_existing: clearExisting,
          force_refresh: forceRefresh
        }
      })

    } catch (error) {
      console.error('Error recalculating matches:', error)
      return NextResponse.json(
        { error: 'Failed to recalculate matches' },
        { status: 500 }
      )
    }
  })
)