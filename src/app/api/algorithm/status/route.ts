import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'

export const dynamic = 'force-dynamic'

// GET /api/algorithm/status - Get current algorithm status (authenticated users only)
export const GET = withSecurityHeaders(
  rateLimit(20, 60000)( // 20 requests per minute
    withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
      try {
        // Get active algorithm changes (last 48 hours)
        const since = new Date()
        since.setHours(since.getHours() - 48)

        const supabaseAdmin = getSupabaseAdmin()
        const { data: activeChanges, error: changesError } = await supabaseAdmin
          .from('algorithm_changes')
          .select(`
            id,
            change_type,
            metric_name,
            percent_change,
            confidence_score,
            detected_at,
            niches_affected,
            recommendations,
            status
          `)
          .gte('detected_at', since.toISOString())
          .in('status', ['detected', 'monitoring', 'confirmed'])
          .order('confidence_score', { ascending: false })
          .limit(50) // Limit to prevent large responses

        if (changesError) {
          throw changesError
        }

        // Determine overall algorithm status based on confidence and scale
        const highConfidenceChanges = activeChanges?.filter((c: any) => (c.confidence_score || 0) >= 80) || []
        const majorChanges = activeChanges?.filter((c: any) => Math.abs(c.percent_change || 0) >= 30) || []
        
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
        const allRecommendations = activeChanges?.flatMap((c: any) => c.recommendations || []) || []
        const uniqueRecommendations = [...new Set(allRecommendations)].slice(0, 5)

        return NextResponse.json({
          status: overallStatus,
          message: statusMessage,
          active_changes: activeChanges?.length || 0,
          last_check: new Date().toISOString(),
          recommendations: uniqueRecommendations,
          changes: activeChanges?.map((c: any) => ({
            id: c.id,
            type: c.change_type,
            metric: c.metric_name,
            change_percentage: c.percent_change,
            confidence: c.confidence_score,
            detected_at: c.detected_at,
            niches: c.niches_affected
            // Don't expose sensitive data like before/after values, affected user counts
          }))
        })

      } catch (error) {
        console.error('Error fetching algorithm status:', error)
        return NextResponse.json(
          { error: 'Failed to fetch algorithm status' },
          { status: 500 }
        )
      }
    })
  )
)