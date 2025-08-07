import { NextRequest, NextResponse } from 'next/server'
import { InstagramTrendCollector } from '@/lib/trends/instagram-collector'
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
    const supabaseAdmin = getSupabaseAdmin()
    // This endpoint should be protected - only allow from cron jobs
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting trend collection job')
    
    // Get a real Instagram access token from database
    // For now, we'll use the first available token from any user
    const { data: tokenData } = await supabaseAdmin
      .from('user_tokens')
      .select('instagram_access_token')
      .not('instagram_access_token', 'is', null)
      .limit(1)
      .single()
    
    const accessToken = tokenData?.instagram_access_token as string | undefined
    if (!accessToken) {
      console.error('No Instagram access token available for trend collection')
      return NextResponse.json({ error: 'No Instagram access token' }, { status: 500 })
    }

    const collector = new InstagramTrendCollector(accessToken)

    const allTrends = []

    // Collect trends for each niche
    for (const niche of SUPPORTED_NICHES) {
      console.log(`Collecting trends for ${niche}`)
      
      try {
        // Collect trends (topics, formats, and basic hashtags)
        const trends = await collector.collectTrends(niche)
        allTrends.push(...trends)

        // Analyze competitors if available
        const competitorTrends = await collector.analyzeNicheCompetitors(niche)
        allTrends.push(...competitorTrends)

        // Save trends to database
        await TrendManager.saveTrends([...trends, ...competitorTrends])
        
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
  const supabaseAdmin = getSupabaseAdmin()
  
  // Check if user is authenticated
  const url = new URL(request.url)
  const testMode = url.searchParams.get('test') === 'true'
  
  if (!testMode) {
    return NextResponse.json({ error: 'This endpoint is for scheduled jobs only' }, { status: 403 })
  }

  // For testing, get user's Instagram token from database
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user's Instagram access token
  const { data: tokenData, error } = await supabaseAdmin
    .from('user_tokens')
    .select('instagram_access_token')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData?.instagram_access_token) {
    return NextResponse.json({ error: 'No Instagram access token found' }, { status: 400 })
  }

  // For testing, collect trends for a single niche
  const niche = url.searchParams.get('niche') || 'lifestyle'
  const collector = new InstagramTrendCollector(tokenData.instagram_access_token as string)
  
  try {
    const trends = await collector.collectTrends(niche)
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