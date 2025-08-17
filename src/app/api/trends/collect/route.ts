import { NextRequest, NextResponse } from 'next/server'
import { XTwitterCollector } from '@/lib/trends/x-twitter-collector'
import { TrendManager } from '@/lib/trends/trend-manager'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// List of niches to collect trends for
const SUPPORTED_NICHES = [
  'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
  'travel', 'business', 'parenting', 'tech', 'education'
]

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected - only allow from cron jobs or Vercel cron
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'
    
    if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting X/Twitter trend collection job')
    
    // Use X/Twitter collector instead of Instagram
    const collector = new XTwitterCollector()

    const allTrends = []

    // Collect trends for each niche
    for (const niche of SUPPORTED_NICHES) {
      console.log(`Collecting X/Twitter trends for ${niche}`)
      
      try {
        // Collect real X/Twitter trends
        const xTrends = await collector.collectTrends(niche)
        
        // Convert X/Twitter trends to our TrendData format
        const trends = xTrends.map(xTrend => ({
          niche,
          trend_type: 'hashtag' as const,
          trend_name: xTrend.query,
          growth_velocity: Math.round(xTrend.trending_score),
          current_volume: xTrend.top_tweets.length * 1000, // Estimate based on sample
          engagement_rate: xTrend.avg_engagement,
          saturation_level: Math.min(100, xTrend.trending_score),
          confidence_score: Math.min(100, Math.round(xTrend.trending_score * 1.2)),
          trend_phase: (xTrend.trending_score > 70 ? 'growing' : xTrend.trending_score > 40 ? 'peak' : 'emerging') as 'emerging' | 'growing' | 'peak' | 'declining',
          related_hashtags: xTrend.content_insights.viral_elements.filter(e => e.startsWith('#')),
          example_posts: xTrend.top_tweets.slice(0, 3).map(t => t.content),
          optimal_posting_times: [9, 12, 17, 20] // Standard peak times
        }))
        
        allTrends.push(...trends)

        // Save trends to database
        await TrendManager.saveTrends(trends)
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error collecting X/Twitter trends for ${niche}:`, error)
      }
    }

    // Clean up old trends
    await TrendManager.cleanupOldTrends()

    return NextResponse.json({
      success: true,
      trends_collected: allTrends.length,
      niches_processed: SUPPORTED_NICHES.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Trend collection error:', error)
    return NextResponse.json(
      { error: 'Failed to collect trends' },
      { status: 500 }
    )
  }
}

// Manual trigger for testing
export async function GET(request: NextRequest) {
  // Check if user is authenticated
  const url = new URL(request.url)
  const testMode = url.searchParams.get('test') === 'true'
  
  if (!testMode) {
    return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
  }

  // For testing, collect X/Twitter trends for a single niche
  const niche = url.searchParams.get('niche') || 'lifestyle'
  const collector = new XTwitterCollector()
  
  try {
    console.log(`Testing X/Twitter trend collection for ${niche}`)
    const xTrends = await collector.collectTrends(niche)
    
    // Convert to our format
    const trends = xTrends.map(xTrend => ({
      niche,
      trend_type: 'hashtag' as const,
      trend_name: xTrend.query,
      growth_velocity: Math.round(xTrend.trending_score),
      current_volume: xTrend.top_tweets.length * 1000,
      engagement_rate: xTrend.avg_engagement,
      saturation_level: Math.min(100, xTrend.trending_score),
      confidence_score: Math.min(100, Math.round(xTrend.trending_score * 1.2)),
      trend_phase: (xTrend.trending_score > 70 ? 'growing' : xTrend.trending_score > 40 ? 'peak' : 'emerging') as 'emerging' | 'growing' | 'peak' | 'declining',
      related_hashtags: xTrend.content_insights.viral_elements.filter(e => e.startsWith('#')),
      example_posts: xTrend.top_tweets.slice(0, 3).map(t => t.content),
      optimal_posting_times: [9, 12, 17, 20]
    }))
    
    await TrendManager.saveTrends(trends)

    return NextResponse.json({
      success: true,
      niche,
      trends_found: trends.length,
      top_trends: trends.slice(0, 5).map(t => ({
        name: t.trend_name,
        confidence: t.confidence_score,
        phase: t.trend_phase,
        engagement: t.engagement_rate
      }))
    })
  } catch (error) {
    console.error('Test collection error:', error)
    return NextResponse.json({ error: 'Failed to collect trends' }, { status: 500 })
  }
}