import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get current month dates
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get outreach stats
    const { data: outreachData, error: outreachError } = await supabaseAdmin
      .from('outreach_tracking')
      .select(`
        *,
        match:brand_matches(
          *,
          brand:brands(*),
          profile:profiles(*)
        )
      `)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())

    if (outreachError) {
      throw outreachError
    }

    // Calculate stats
    const stats = {
      totalOutreachSent: outreachData?.filter(o => ['sent', 'opened', 'replied', 'deal_closed'].includes(o.outreach_status)).length || 0,
      totalResponses: outreachData?.filter(o => o.outreach_status === 'replied').length || 0,
      responseRate: 0,
      positiveResponses: outreachData?.filter(o => o.response_sentiment === 'positive').length || 0,
      scheduledOutreach: outreachData?.filter(o => o.outreach_status === 'scheduled').length || 0,
      activeDeals: outreachData?.filter(o => o.outreach_status === 'meeting_scheduled').length || 0
    }

    // Calculate response rate
    if (stats.totalOutreachSent > 0) {
      stats.responseRate = Math.round((stats.totalResponses / stats.totalOutreachSent) * 100)
    }

    // Get recent activity
    const recentActivity = outreachData
      ?.slice(0, 10)
      .map(activity => ({
        id: activity.id,
        brand_name: activity.match?.brand?.name || 'Unknown Brand',
        brand_logo: activity.match?.brand?.logo_url,
        channel: activity.outreach_channel,
        status: activity.outreach_status,
        sent_at: activity.sent_at,
        response_sentiment: activity.response_sentiment,
        creator_name: activity.match?.profile?.full_name || 'Unknown Creator',
        match_score: activity.match?.match_score || 0
      })) || []

    return NextResponse.json({
      success: true,
      stats,
      recentActivity
    })

  } catch (error) {
    console.error('Error fetching outreach stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch outreach statistics' },
      { status: 500 }
    )
  }
}