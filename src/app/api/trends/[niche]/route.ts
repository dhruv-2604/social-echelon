import { NextRequest, NextResponse } from 'next/server'
import { withValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { TrendsQuerySchema, TrendingHashtagsSchema, validateNiche } from '@/lib/validation/schemas'
import { TrendManager } from '@/lib/trends/trend-manager'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Path parameter validation
const NicheParamsSchema = z.object({
  niche: validateNiche
})

export const GET = withSecurityHeaders(
  withValidation({
    params: NicheParamsSchema,
    query: TrendsQuerySchema.omit({ niche: true })
  })(async (request: NextRequest, { validatedParams, validatedQuery }) => {
    try {
      if (!validatedParams) {
        return NextResponse.json({ error: 'Invalid niche parameter' }, { status: 400 })
      }

      const { niche } = validatedParams
      const minConfidence = validatedQuery?.minConfidence || 60
      const trendType = validatedQuery?.type

      console.log(`Fetching trends for ${niche} with min confidence ${minConfidence}`)

      // Get trends from database
      let trends = await TrendManager.getTrendsForNiche(niche, minConfidence)

      // Filter by type if specified
      if (trendType) {
        trends = trends.filter(t => t.trend_type === trendType)
      }

      // Get analysis summary
      const analysis = await TrendManager.analyzeTrendsForNiche(niche)

      return NextResponse.json({
        success: true,
        niche,
        trends: trends.map(t => ({
          id: t.id,
          type: t.trend_type,
          name: t.trend_name,
          confidence: t.confidence_score,
          phase: t.trend_phase,
          growth: t.growth_velocity,
          engagement: t.engagement_rate,
          saturation: t.saturation_level,
          related: t.related_hashtags,
          optimal_times: t.optimal_posting_times
        })),
        summary: analysis.niche_summary,
        generated_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error fetching trends:', error)
      return NextResponse.json(
        { error: 'Failed to fetch trends' },
        { status: 500 }
      )
    }
  })
)

export const POST = withSecurityHeaders(
  withValidation({
    params: NicheParamsSchema,
    body: TrendingHashtagsSchema.omit({ niche: true })
  })(async (request: NextRequest, { validatedParams, validatedBody }) => {
    try {
      if (!validatedParams) {
        return NextResponse.json({ error: 'Invalid niche parameter' }, { status: 400 })
      }

      const { niche } = validatedParams
      const limit = validatedBody?.limit || 10

      const hashtags = await TrendManager.getTrendingHashtags(niche, limit)

      return NextResponse.json({
        success: true,
        niche,
        hashtags,
        count: hashtags.length
      })

    } catch (error) {
      console.error('Error fetching hashtags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch hashtags' },
        { status: 500 }
      )
    }
  })
)