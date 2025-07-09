import { NextRequest, NextResponse } from 'next/server'
import { InstagramTrendCollector } from '@/lib/trends/instagram-collector'
import { TrendManager } from '@/lib/trends/trend-manager'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// List of niches to collect trends for
const SUPPORTED_NICHES = [
  'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
  'travel', 'business', 'parenting', 'tech', 'education'
]

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected - only allow from cron jobs
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting trend collection job')
    
    // Get a system Instagram token (in production, use a dedicated account)
    // For now, we'll use mock data
    const mockToken = 'system-trend-collector'
    const collector = new InstagramTrendCollector(mockToken)

    const allTrends = []

    // Collect trends for each niche
    for (const niche of SUPPORTED_NICHES) {
      console.log(`Collecting trends for ${niche}`)
      
      try {
        // Collect hashtag trends
        const hashtagTrends = await collector.collectHashtagTrends(niche)
        allTrends.push(...hashtagTrends)

        // Analyze competitors
        const competitorTrends = await collector.analyzeNicheCompetitors(niche)
        allTrends.push(...competitorTrends)

        // Save trends to database
        await TrendManager.saveTrends([...hashtagTrends, ...competitorTrends])
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error collecting trends for ${niche}:`, error)
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

  // For testing, collect trends for a single niche
  const niche = url.searchParams.get('niche') || 'lifestyle'
  const collector = new InstagramTrendCollector('test-token')
  
  try {
    const trends = await collector.collectHashtagTrends(niche)
    await TrendManager.saveTrends(trends)

    return NextResponse.json({
      success: true,
      niche,
      trends_found: trends.length,
      top_trends: trends.slice(0, 5).map(t => ({
        name: t.trend_name,
        confidence: t.confidence_score,
        phase: t.trend_phase
      }))
    })
  } catch (error) {
    console.error('Test collection error:', error)
    return NextResponse.json({ error: 'Failed to collect trends' }, { status: 500 })
  }
}