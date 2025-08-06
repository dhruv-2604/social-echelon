import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// GET /api/algorithm/history - Get historical algorithm changes
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '30')
    const niche = url.searchParams.get('niche')
    const changeType = url.searchParams.get('type')

    // Calculate date range
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Build query - explicitly select all fields to avoid issues
  const supabaseAdmin = getSupabaseAdmin()
    let query = supabaseAdmin
      .from('algorithm_changes')
      .select(`
        id,
        change_type,
        metric_name,
        before_value,
        after_value,
        percent_change,
        affected_users_count,
        sample_size,
        confidence_score,
        niches_affected,
        recommendations,
        status,
        detected_at,
        confirmed_at,
        created_at,
        updated_at
      `)
      .gte('detected_at', since.toISOString())
      .order('detected_at', { ascending: false })

    // Apply filters
    if (changeType) {
      query = query.eq('change_type', changeType)
    }

    if (niche) {
      query = query.contains('niches_affected', [niche])
    }

    const { data: changes, error } = await query

    if (error) {
      throw error
    }

    // Group changes by week for easier visualization
    const changesByWeek = changes?.reduce((acc: any, change) => {
      const weekStart = new Date(change.detected_at)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Start of week
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!acc[weekKey]) {
        acc[weekKey] = {
          week_start: weekKey,
          changes: [],
          avg_impact: 0,
          total_affected_users: 0
        }
      }
      
      acc[weekKey].changes.push(change)
      acc[weekKey].total_affected_users += change.affected_users_count
      
      return acc
    }, {})

    // Calculate average impact per week
    Object.values(changesByWeek || {}).forEach((week: any) => {
      const totalImpact = week.changes.reduce((sum: number, c: any) => 
        sum + Math.abs(c.change_percentage), 0
      )
      week.avg_impact = totalImpact / week.changes.length
    })

    // Get summary statistics
    const totalChanges = changes?.length || 0
    const avgConfidence = changes?.reduce((sum, c) => sum + c.confidence_score, 0) / (totalChanges || 1)
    const mostAffectedNiche = getMostAffectedNiche(changes || [])
    const mostCommonType = getMostCommonChangeType(changes || [])

    return NextResponse.json({
      period_days: days,
      total_changes: totalChanges,
      avg_confidence: Math.round(avgConfidence),
      most_affected_niche: mostAffectedNiche,
      most_common_type: mostCommonType,
      changes_by_week: changesByWeek,
      changes: changes || [],  // Return raw changes for the frontend
      recent_changes: changes?.slice(0, 10).map(c => ({
        id: c.id,
        date: c.detected_at,
        type: c.change_type,
        metric: c.metric_name,
        impact: `${c.percent_change > 0 ? '+' : ''}${c.percent_change}%`,
        confidence: c.confidence_score,
        recommendations: c.recommendations
      }))
    })

  } catch (error) {
    console.error('Error fetching algorithm history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch algorithm history' },
      { status: 500 }
    )
  }
}

function getMostAffectedNiche(changes: any[]): string {
  const nicheCounts: Record<string, number> = {}
  
  changes.forEach(change => {
    change.niches_affected?.forEach((niche: string) => {
      nicheCounts[niche] = (nicheCounts[niche] || 0) + 1
    })
  })
  
  const sorted = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'none'
}

function getMostCommonChangeType(changes: any[]): string {
  const typeCounts: Record<string, number> = {}
  
  changes.forEach(change => {
    typeCounts[change.change_type] = (typeCounts[change.change_type] || 0) + 1
  })
  
  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'none'
}