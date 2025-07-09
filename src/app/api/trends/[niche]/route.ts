import { NextRequest, NextResponse } from 'next/server'
import { TrendManager } from '@/lib/trends/trend-manager'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ niche: string }> }
) {
  try {
    const { niche } = await params
    const url = new URL(request.url)
    const minConfidence = parseInt(url.searchParams.get('minConfidence') || '60')
    const trendType = url.searchParams.get('type') // hashtag, topic, format, audio

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
}

// Get trending hashtags specifically for content generation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ niche: string }> }
) {
  try {
    const { niche } = await params
    const body = await request.json()
    const limit = body.limit || 10

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
}