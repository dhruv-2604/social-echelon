import { NextRequest, NextResponse } from 'next/server'
import { ContentAnalyzer } from '@/lib/intelligence/content-analyzer'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Optional analysis options
const AnalysisOptionsSchema = z.object({
  forceRefresh: z.boolean().default(false), // Skip cache and re-analyze
  analysisDepth: z.enum(['basic', 'standard', 'deep']).default('standard'),
  includeCompetitors: z.boolean().default(false)
}).optional()

// POST /api/intelligence/analyze - Analyze current user's content
export const POST = withSecurityHeaders(
  rateLimit(3, 86400000)( // Only 3 analyses per day (expensive AI operation)
    withAuthAndValidation({
      body: AnalysisOptionsSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        const options = validatedBody || { 
          forceRefresh: false, 
          analysisDepth: 'standard',
          includeCompetitors: false
        }

        // Check if user already has recent analysis (unless force refresh)
        if (!options.forceRefresh) {
          const supabase = getSupabaseAdmin()
          const { data: existingInsights } = await supabase
            .from('user_content_insights')
            .select('updated_at')
            .eq('user_id', userId)
            .single()

          if (existingInsights?.updated_at) {
            const lastUpdate = new Date(existingInsights.updated_at as string)
            const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)
            
            if (hoursSinceUpdate < 24) {
              return NextResponse.json({
                success: true,
                message: 'Recent analysis already exists',
                cached: true,
                hours_since_update: Math.round(hoursSinceUpdate),
                next_available: new Date(lastUpdate.getTime() + 24 * 60 * 60 * 1000).toISOString()
              })
            }
          }
        }

        const analyzer = new ContentAnalyzer()
        await analyzer.analyzeUserContent(userId)

        return NextResponse.json({
          success: true,
          message: 'Content analysis completed',
          user_id: userId,
          analysis_depth: options.analysisDepth,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Content analysis error:', error)
        return NextResponse.json(
          { error: 'Failed to analyze content' },
          { status: 500 }
        )
      }
    })
  )
)

// GET /api/intelligence/analyze - Get user's content insights
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      // Get user's personalized insights
      const supabase = getSupabaseAdmin()

      const { data: insights } = await supabase
        .from('user_content_insights')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Get top performing content patterns
      const { data: patterns } = await supabase
        .from('content_patterns')
        .select('*')
        .gte('confidence_score', 70)
        .order('avg_performance_score', { ascending: false })
        .limit(5)

      return NextResponse.json({
        success: true,
        personal_insights: insights,
        top_patterns: patterns,
        recommendations: generateRecommendations(insights, patterns || [])
      })

    } catch (error) {
      console.error('Error fetching insights:', error)
      return NextResponse.json(
        { error: 'Failed to fetch insights' },
        { status: 500 }
      )
    }
  })
)

function generateRecommendations(insights: any, patterns: any[]): string[] {
  const recommendations: string[] = []

  if (!insights) {
    recommendations.push('Analyze your content to get personalized insights')
    return recommendations
  }

  // Caption length recommendation
  if (insights.best_caption_length) {
    recommendations.push(
      `Keep captions between ${insights.best_caption_length[0]}-${insights.best_caption_length[1]} characters`
    )
  }

  // Hashtag recommendation
  if (insights.best_hashtag_count) {
    recommendations.push(
      `Use ${insights.best_hashtag_count} hashtags for optimal reach`
    )
  }

  // Timing recommendation
  if (insights.best_posting_hour !== null) {
    recommendations.push(
      `Post at ${insights.best_posting_hour}:00 for best engagement`
    )
  }

  // Format recommendation
  if (insights.best_content_format) {
    recommendations.push(
      `${insights.best_content_format}s are your best performing format`
    )
  }

  // Add top pattern recommendations
  patterns.slice(0, 2).forEach(pattern => {
    recommendations.push(pattern.pattern_description)
  })

  return recommendations
}