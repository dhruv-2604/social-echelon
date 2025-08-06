import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/algorithm/status - Get current algorithm status
export async function GET(request: NextRequest) {
  try {
    // Get active algorithm changes (last 48 hours)
    const since = new Date()
    since.setHours(since.getHours() - 48)

  const supabaseAdmin = getSupabaseAdmin()
    const { data: activeChanges, error: changesError } = await supabaseAdmin
      .from('algorithm_changes')
      .select('*')
      .gte('detected_at', since.toISOString())
      .in('status', ['detected', 'monitoring', 'confirmed'])
      .order('confidence_score', { ascending: false })

    if (changesError) {
      throw changesError
    }

    // Get recent niche performance trends
    const { data: nicheTrends, error: trendsError } = await supabaseAdmin
      .from('niche_performance_trends')
      .select('*')
      .gte('week_start', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('week_start', { ascending: false })

    if (trendsError) {
      // Table might not exist yet, continue without trends
      console.log('Niche trends not available:', trendsError)
    }

    // Determine overall algorithm status based on confidence and scale
    const highConfidenceChanges = activeChanges?.filter(c => c.confidence_score >= 80) || []
    const majorChanges = activeChanges?.filter(c => Math.abs(c.percent_change) >= 30) || []
    
    let overallStatus = 'stable'
    let statusMessage = 'Instagram algorithm is operating normally'
    
    if (majorChanges.length > 0 && highConfidenceChanges.length > 0) {
      overallStatus = 'critical'
      statusMessage = 'Major algorithm changes detected - immediate action recommended'
    } else if (highConfidenceChanges.length > 0) {
      overallStatus = 'changing'
      statusMessage = 'Significant algorithm changes detected - review recommendations'
    } else if (activeChanges && activeChanges.length > 0) {
      overallStatus = 'monitoring'
      statusMessage = 'Potential algorithm changes detected - monitoring situation'
    }

    // Get top recommendations across all changes
    const allRecommendations = activeChanges?.flatMap(c => c.recommendations || []) || []
    const uniqueRecommendations = [...new Set(allRecommendations)].slice(0, 5)

    return NextResponse.json({
      status: overallStatus,
      message: statusMessage,
      active_changes: activeChanges?.length || 0,
      last_check: new Date().toISOString(),
      recommendations: uniqueRecommendations,
      changes: activeChanges?.map(c => ({
        id: c.id,
        type: c.change_type,
        metric: c.metric_name,
        change_percentage: c.percent_change,
        confidence: c.confidence_score,
        detected_at: c.detected_at,
        affected_users: c.affected_users_count,
        niches: c.niches_affected,
        before: c.before_value,
        after: c.after_value
      })),
      niche_trends: nicheTrends?.reduce((acc: any, trend) => {
        if (!acc[trend.niche]) acc[trend.niche] = {}
        acc[trend.niche] = {
          best_content_type: trend.best_content_type,
          avg_reach: trend.avg_reach_per_post,
          engagement_rate: trend.avg_engagement_rate,
          reach_change: trend.reach_change_percent
        }
        return acc
      }, {})
    })

  } catch (error) {
    console.error('Error fetching algorithm status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch algorithm status' },
      { status: 500 }
    )
  }
}