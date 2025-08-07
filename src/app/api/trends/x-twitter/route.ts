import { NextRequest, NextResponse } from 'next/server'
import { XTwitterCollector } from '@/lib/trends/x-twitter-collector'

export const dynamic = 'force-dynamic'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const niche = url.searchParams.get('niche') || 'lifestyle'
    
    console.log(`Fetching X/Twitter trends for niche: ${niche}`)
    
    const collector = new XTwitterCollector()
    const trends = await collector.collectTrends(niche)
    
    // Store trends in database for historical tracking
    for (const trend of trends) {
  const supabaseAdmin = getSupabaseAdmin()
      await supabaseAdmin
        .from('trends')
        .upsert({
          niche,
          trend_type: 'topic',
          trend_name: trend.query,
          confidence_score: trend.trending_score,
          growth_velocity: trend.avg_engagement,
          source: 'x-twitter',
          metadata: {
            top_tweets: trend.top_tweets.slice(0, 3),
            content_insights: trend.content_insights
          }
        }, {
          onConflict: 'niche,trend_type,trend_name'
        })
    }
    
    return NextResponse.json({
      success: true,
      niche,
      trends,
      insights: generateCrossPlatformInsights(trends),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('X/Twitter trends error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch X/Twitter trends' },
      { status: 500 }
    )
  }
}

/**
 * Generate insights on how X trends can be applied to Instagram
 */
function generateCrossPlatformInsights(trends: any[]): any {
  const highEngagementTrends = trends.filter(t => t.avg_engagement > 500)
  const viralFormats = trends.flatMap(t => t.content_insights.common_formats)
  const viralElements = trends.flatMap(t => t.content_insights.viral_elements)
  
  return {
    hot_topics: highEngagementTrends.map(t => ({
      topic: t.query,
      instagram_potential: calculateInstagramPotential(t),
      suggested_content: suggestInstagramContent(t)
    })),
    cross_platform_tips: [
      ...new Set(viralElements),
      ...new Set(viralFormats)
    ],
    timing_insight: 'Content that trends on X often appears on Instagram 2-3 days later'
  }
}

function calculateInstagramPotential(trend: any): string {
  if (trend.trending_score > 80) return 'High - Post immediately'
  if (trend.trending_score > 50) return 'Medium - Good for next 24-48h'
  return 'Low - Monitor for growth'
}

function suggestInstagramContent(trend: any): string[] {
  const suggestions: string[] = []
  
  if (trend.content_insights.common_formats.includes('Tips & advice')) {
    suggestions.push('Create a carousel post with actionable tips')
  }
  
  if (trend.content_insights.common_formats.includes('Opinion posts')) {
    suggestions.push('Share your take with a thought-provoking caption')
  }
  
  if (trend.content_insights.viral_elements.includes('Questions drive engagement')) {
    suggestions.push('End your caption with an engaging question')
  }
  
  if (trend.avg_engagement > 1000) {
    suggestions.push('This is viral - create a Reel while it\'s hot!')
  }
  
  return suggestions
}