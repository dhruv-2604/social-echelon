import { NextRequest, NextResponse } from 'next/server'
import { XTwitterCollector } from '@/lib/trends/x-twitter-collector'
import { TrendManager } from '@/lib/trends/trend-manager'
import { withSecurityHeaders, rateLimit, withAuthAndValidation } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// List of niches to collect trends for
const SUPPORTED_NICHES = [
  'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
  'travel', 'business', 'parenting', 'tech', 'education'
] as const

// Validation for POST body
const TrendCollectionSchema = z.object({
  niches: z.array(z.enum(SUPPORTED_NICHES)).optional(),
  maxPerNiche: z.number().min(1).max(10).default(5)
}).optional()

// Validation for GET query params  
const TrendTestSchema = z.object({
  test: z.literal('true'),
  niche: z.enum(SUPPORTED_NICHES).optional()
})

// Helper to verify cron authorization
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  
  return isVercelCron || (!!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`)
}

// POST - Scheduled trend collection (cron job)
export const POST = withSecurityHeaders(
  rateLimit(10, 3600000)( // 10 collections per hour max
    async (request: NextRequest) => {
      try {
        // This endpoint should be protected - only allow from cron jobs
        if (!verifyCronAuth(request)) {
          return NextResponse.json({ 
            error: 'Unauthorized - Cron authentication required',
            hint: 'Set CRON_SECRET env var and use Bearer token'
          }, { status: 401 })
        }

        // Parse optional body for custom collection params
        let body: any = {}
        try {
          const text = await request.text()
          if (text) {
            body = JSON.parse(text)
          }
        } catch {
          // No body or invalid JSON - use defaults
        }

        const validatedBody = TrendCollectionSchema.parse(body)
        const nichesToCollect = validatedBody?.niches || SUPPORTED_NICHES
        const maxPerNiche = validatedBody?.maxPerNiche || 5

        console.log(`Starting X/Twitter trend collection for ${nichesToCollect.length} niches`)
        
        const collector = new XTwitterCollector()
        const allTrends = []
        const errors = []

        // Collect trends for each niche with rate limiting
        for (const niche of nichesToCollect) {
          console.log(`Collecting X/Twitter trends for ${niche}`)
          
          try {
            // Collect real X/Twitter trends
            const xTrends = await collector.collectTrends(niche)
            
            // Limit trends per niche
            const limitedTrends = xTrends.slice(0, maxPerNiche)
            
            // Convert X/Twitter trends to our TrendData format
            const trends = limitedTrends.map(xTrend => ({
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
            
            // Add delay to avoid rate limits (2 seconds between niches)
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (error) {
            console.error(`Error collecting X/Twitter trends for ${niche}:`, error)
            errors.push({ niche, error: String(error) })
          }
        }

        // Clean up old trends
        await TrendManager.cleanupOldTrends()

        return NextResponse.json({
          success: true,
          trends_collected: allTrends.length,
          niches_processed: nichesToCollect.length,
          errors: errors.length > 0 ? errors : undefined,
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
  )
)

// GET - Manual testing endpoint (protected with auth)
export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: TrendTestSchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      // Check if user is admin for testing
      const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
      const supabase = getSupabaseAdmin()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Admin access required for trend testing' 
        }, { status: 403 })
      }

      const niche = validatedQuery?.niche || 'lifestyle'
      const collector = new XTwitterCollector()
      
      console.log(`Testing X/Twitter trend collection for ${niche}`)
      const xTrends = await collector.collectTrends(niche)
      
      // Convert to our format (limited to 3 for testing)
      const trends = xTrends.slice(0, 3).map(xTrend => ({
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

      return NextResponse.json({
        success: true,
        test_mode: true,
        niche,
        trends,
        count: trends.length
      })

    } catch (error) {
      console.error('Test collection error:', error)
      return NextResponse.json(
        { error: 'Failed to collect test trends' },
        { status: 500 }
      )
    }
  })
)