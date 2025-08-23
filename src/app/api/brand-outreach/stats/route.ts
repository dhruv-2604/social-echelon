import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Query parameters for stats filtering
const OutreachStatsQuerySchema = z.object({
  timeframe: z.enum(['week', 'month', 'quarter']).optional().default('month')
}).optional()

// GET - Get user's outreach stats (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(30, 60000)( // 30 requests per minute
    withAuthAndValidation({
      query: OutreachStatsQuerySchema
    })(async (request: NextRequest, userId: string, { validatedQuery }) => {
      try {
        const supabaseAdmin = getSupabaseAdmin()
        const timeframe = validatedQuery?.timeframe || 'month'

        // Calculate date range based on timeframe
        const now = new Date()
        let startDate: Date

        switch (timeframe) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
        }

        // Get outreach stats - ONLY for the authenticated user
        const { data: outreachData, error: outreachError } = await supabaseAdmin
          .from('outreach_tracking')
          .select(`
            id,
            outreach_status,
            outreach_channel,
            response_sentiment,
            sent_at,
            created_at,
            brand_matches!match_id(
              id,
              match_score,
              user_id,
              brands(
                id,
                display_name,
                industry
              )
            )
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', now.toISOString())
          // Ensure we only get outreach for this user's brand matches
          .eq('brand_matches.user_id', userId)

        if (outreachError) {
          console.error('Outreach stats error:', outreachError)
          throw outreachError
        }

        // Filter and validate data (ensure user can only see their own stats)
        const userOutreach = outreachData?.filter(
          (o: any) => o.brand_matches?.user_id === userId
        ) || []

        // Calculate stats
        const stats = {
          totalOutreachSent: userOutreach.filter((o: any) => 
            ['sent', 'opened', 'replied', 'deal_closed'].includes(o.outreach_status)
          ).length,
          totalResponses: userOutreach.filter((o: any) => 
            o.outreach_status === 'replied'
          ).length,
          responseRate: 0,
          positiveResponses: userOutreach.filter((o: any) => 
            o.response_sentiment === 'positive'
          ).length,
          scheduledOutreach: userOutreach.filter((o: any) => 
            o.outreach_status === 'scheduled'
          ).length,
          activeDeals: userOutreach.filter((o: any) => 
            ['meeting_scheduled', 'negotiating'].includes(o.outreach_status)
          ).length,
          timeframe: timeframe
        }

        // Calculate response rate
        if (stats.totalOutreachSent > 0) {
          stats.responseRate = Math.round((stats.totalResponses / stats.totalOutreachSent) * 100)
        }

        // Get recent activity (limit and sanitize)
        const recentActivity = userOutreach
          .slice(0, 10)
          .map((activity: any) => ({
            id: activity.id,
            brand_name: activity.brand_matches?.brands?.display_name || 'Unknown Brand',
            industry: activity.brand_matches?.brands?.industry,
            channel: activity.outreach_channel,
            status: activity.outreach_status,
            sent_at: activity.sent_at,
            response_sentiment: activity.response_sentiment,
            match_score: Math.min(100, Math.max(0, activity.brand_matches?.match_score || 0))
            // Don't expose sensitive brand or user data
          }))

        return NextResponse.json({
          success: true,
          stats,
          recentActivity,
          summary: {
            mostActiveChannel: getMostActiveChannel(userOutreach),
            averageResponseTime: calculateAverageResponseTime(userOutreach),
            topPerformingIndustry: getTopPerformingIndustry(userOutreach)
          }
        })

      } catch (error) {
        console.error('Error fetching outreach stats:', error)
        return NextResponse.json(
          { error: 'Failed to fetch outreach statistics' },
          { status: 500 }
        )
      }
    })
  )
)

// Helper functions
function getMostActiveChannel(outreach: any[]): string {
  const channelCounts: Record<string, number> = {}
  outreach.forEach(o => {
    channelCounts[o.outreach_channel] = (channelCounts[o.outreach_channel] || 0) + 1
  })
  const sorted = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'email'
}

function calculateAverageResponseTime(outreach: any[]): number {
  const responded = outreach.filter(o => o.outreach_status === 'replied' && o.sent_at)
  if (responded.length === 0) return 0
  
  const totalHours = responded.reduce((sum, o) => {
    const sent = new Date(o.sent_at)
    const replied = new Date(o.updated_at || o.created_at)
    return sum + (replied.getTime() - sent.getTime()) / (1000 * 60 * 60)
  }, 0)
  
  return Math.round(totalHours / responded.length)
}

function getTopPerformingIndustry(outreach: any[]): string {
  const industrySuccess: Record<string, { total: number, positive: number }> = {}
  
  outreach.forEach(o => {
    const industry = o.brand_matches?.brands?.industry || 'Unknown'
    if (!industrySuccess[industry]) {
      industrySuccess[industry] = { total: 0, positive: 0 }
    }
    industrySuccess[industry].total++
    if (o.response_sentiment === 'positive') {
      industrySuccess[industry].positive++
    }
  })
  
  const sorted = Object.entries(industrySuccess)
    .map(([industry, stats]) => ({
      industry,
      successRate: stats.total > 0 ? stats.positive / stats.total : 0
    }))
    .sort((a, b) => b.successRate - a.successRate)
  
  return sorted[0]?.industry || 'Fashion'
}