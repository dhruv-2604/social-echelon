import { NextRequest, NextResponse } from 'next/server'
import { TrendManager } from '@/lib/trends/trend-manager'
import { withSecurityHeaders, rateLimit, withAuthAndValidation } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// List of niches to collect trends for
const SUPPORTED_NICHES = [
  'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
  'travel', 'business', 'parenting', 'tech', 'education'
] as const

// Helper function to get relevant hashtags for each niche
function getNicheHashtags(niche: string): string[] {
  const hashtagMap: Record<string, string[]> = {
    fitness: ['fitness', 'workout', 'fitnessmotivation', 'gym', 'fitfam'],
    beauty: ['beauty', 'makeup', 'skincare', 'beautytips', 'makeuptutorial'],
    lifestyle: ['lifestyle', 'lifestyleblogger', 'dailylife', 'livingmybestlife', 'lifestylegoals'],
    fashion: ['fashion', 'ootd', 'fashionista', 'style', 'fashionblogger'],
    food: ['foodie', 'foodstagram', 'foodporn', 'recipe', 'cooking'],
    travel: ['travel', 'wanderlust', 'travelgram', 'vacation', 'explore'],
    business: ['entrepreneur', 'business', 'startup', 'businessowner', 'success'],
    parenting: ['parenting', 'momlife', 'parenthood', 'kids', 'family'],
    tech: ['tech', 'technology', 'innovation', 'coding', 'ai'],
    education: ['education', 'learning', 'study', 'students', 'teaching']
  }
  return hashtagMap[niche] || ['trending', niche]
}

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

// GET - Scheduled trend collection (Vercel cron jobs use GET)
export const GET = withSecurityHeaders(
  rateLimit(10, 3600000)( // 10 collections per hour max
    async (request: NextRequest) => {
      try {
        // This endpoint should be protected - only allow from cron jobs
        // For testing, you can temporarily comment this out
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

        console.log(`Starting Instagram trend collection for ${nichesToCollect.length} niches`)
        
        const allTrends = []
        const errors = []

        // Collect trends for each niche with rate limiting
        for (const niche of nichesToCollect) {
          console.log(`Collecting Instagram trends for ${niche}`)
          
          try {
            // Use Apify Instagram collector instead of X/Twitter
            const { ApifyInstagramCollector } = await import('@/lib/trends/apify-instagram-collector')
            const instagramCollector = new ApifyInstagramCollector()
            
            // Get popular hashtags for this niche
            const hashtagsToAnalyze = getNicheHashtags(niche).slice(0, 3) // Limit to 3 hashtags per niche for cost
            
            // Collect Instagram trends
            const instagramTrends = await instagramCollector.collectHashtagTrends(
              hashtagsToAnalyze,
              100 // Only 100 posts per hashtag to keep costs low
            )
            
            // Convert to our TrendData format
            const trends = instagramTrends.map(trend => ({
              niche,
              trend_type: 'hashtag' as const,
              trend_name: trend.hashtag,
              growth_velocity: Math.round(trend.growthRate || 0),
              current_volume: trend.postCount * 100, // Estimate total volume
              engagement_rate: trend.avgEngagement,
              saturation_level: Math.min(100, trend.postCount / 10),
              confidence_score: Math.min(100, 80), // High confidence for real data
              trend_phase: (trend.growthRate && trend.growthRate > 10 ? 'growing' : trend.growthRate && trend.growthRate > 0 ? 'peak' : 'emerging') as 'emerging' | 'growing' | 'peak' | 'declining',
              related_hashtags: [],
              example_posts: trend.topPosts.slice(0, 3).map(p => p.caption?.substring(0, 100) || ''),
              optimal_posting_times: [9, 12, 17, 20] // Standard peak times
            }))
            
            allTrends.push(...trends)

            // Save trends to database
            await TrendManager.saveTrends(trends)
            
            // Add delay to avoid rate limits (2 seconds between niches)
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (error) {
            console.error(`Error collecting Instagram trends for ${niche}:`, error)
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

// POST - Manual testing endpoint (protected with auth)
export const POST = withSecurityHeaders(
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
      
      // Use Apify Instagram collector for testing
      const { ApifyInstagramCollector } = await import('@/lib/trends/apify-instagram-collector')
      const collector = new ApifyInstagramCollector()
      
      console.log(`Testing Instagram trend collection for ${niche}`)
      const hashtagsToTest = getNicheHashtags(niche).slice(0, 2) // Test with 2 hashtags
      const instagramTrends = await collector.collectHashtagTrends(hashtagsToTest, 50) // Only 50 posts for testing
      
      // Convert to our format
      const trends = instagramTrends.map(trend => ({
        niche,
        trend_type: 'hashtag' as const,
        trend_name: trend.hashtag,
        growth_velocity: Math.round(trend.growthRate || 0),
        current_volume: trend.postCount * 100,
        engagement_rate: trend.avgEngagement,
        saturation_level: Math.min(100, trend.postCount / 10),
        confidence_score: 80,
        trend_phase: (trend.growthRate && trend.growthRate > 10 ? 'growing' : 'emerging') as 'emerging' | 'growing' | 'peak' | 'declining',
        related_hashtags: [],
        example_posts: trend.topPosts.slice(0, 3).map(p => p.caption?.substring(0, 100) || ''),
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