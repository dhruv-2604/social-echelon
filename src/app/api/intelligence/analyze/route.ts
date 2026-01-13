import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders } from '@/lib/validation/middleware'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/intelligence/analyze - Get user's content insights
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const supabase = getSupabaseAdmin()

      // Get user's personalized insights
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
