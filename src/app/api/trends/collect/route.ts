import { NextRequest, NextResponse } from 'next/server'
import { TrendManager } from '@/lib/trends/trend-manager'
import { withSecurityHeaders, rateLimit, withAuthAndValidation } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Budget limits for cost control
const DAILY_BUDGET_USD = 5 // $5 per day max
const MAX_POSTS_PER_DAY = 10000 // At $0.50 per 1000 posts = $5
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000' // Proper UUID for system

// List of niches to collect trends for
const SUPPORTED_NICHES = [
  'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
  'travel', 'business', 'parenting', 'tech', 'education'
] as const

// Helper function to get relevant hashtags for each niche
// Returns MORE hashtags to better capture trends and audio patterns
function getNicheHashtags(niche: string): string[] {
  const hashtagMap: Record<string, string[]> = {
    fitness: ['fitness', 'workout', 'fitnessmotivation', 'gym', 'fitfam', 'gymmotivation', 'fitnessjourney', 'fitnessgirl', 'workoutmotivation', 'homeworkout'],
    beauty: ['beauty', 'makeup', 'skincare', 'beautytips', 'makeuptutorial', 'glowup', 'skincareroutine', 'makeuplooks', 'beautyhacks', 'cleanbeauty'],
    lifestyle: ['lifestyle', 'lifestyleblogger', 'dailylife', 'livingmybestlife', 'lifestylegoals', 'morningroutine', 'selfcare', 'aesthetic', 'thatgirl', 'dailyinspo'],
    fashion: ['fashion', 'ootd', 'fashionista', 'style', 'fashionblogger', 'streetstyle', 'outfitideas', 'fashioninspo', 'styleinspo', 'fashiontrends'],
    food: ['foodie', 'foodstagram', 'foodporn', 'recipe', 'cooking', 'healthyfood', 'foodblogger', 'homecooking', 'easyrecipes', 'mealprep'],
    travel: ['travel', 'wanderlust', 'travelgram', 'vacation', 'explore', 'travelphotography', 'traveltheworld', 'instatravel', 'travelguide', 'bucketlist'],
    business: ['entrepreneur', 'business', 'startup', 'businessowner', 'success', 'smallbusiness', 'businesstips', 'entrepreneurship', 'businessgrowth', 'hustle'],
    parenting: ['parenting', 'momlife', 'parenthood', 'kids', 'family', 'motherhood', 'toddlerlife', 'parentingtips', 'momhacks', 'familytime'],
    tech: ['tech', 'technology', 'innovation', 'coding', 'ai', 'techtrends', 'programming', 'developer', 'artificialintelligence', 'futuretech'],
    education: ['education', 'learning', 'study', 'students', 'teaching', 'studygram', 'studytips', 'onlinelearning', 'studymotivation', 'edtech']
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

// Helper to check daily budget
async function checkDailyBudget(): Promise<{ withinBudget: boolean; postsCollectedToday: number }> {
  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
    const supabaseAdmin = getSupabaseAdmin()
    
    const today = new Date().toISOString().split('T')[0]
    const { data: todayTrends, count } = await supabaseAdmin
      .from('trend_analysis')
      .select('metrics', { count: 'exact' })
      .gte('collected_at', today)
      .eq('user_id', SYSTEM_USER_ID)
    
    // Estimate posts analyzed from metrics
    let postsAnalyzed = 0
    if (todayTrends) {
      todayTrends.forEach((trend: any) => {
        postsAnalyzed += trend.metrics?.postCount || 200 // Default estimate
      })
    }
    
    return {
      withinBudget: postsAnalyzed < MAX_POSTS_PER_DAY,
      postsCollectedToday: postsAnalyzed
    }
  } catch (error) {
    console.error('Error checking budget:', error)
    return { withinBudget: true, postsCollectedToday: 0 } // Continue if check fails
  }
}

// GET - Scheduled trend collection (Vercel cron jobs use GET)
export const GET = withSecurityHeaders(
  rateLimit(10, 3600000)( // 10 collections per hour max
    async (request: NextRequest) => {
      const startTime = Date.now()
      let totalPostsCollected = 0
      const errors: any[] = []
      
      try {
        // Verify cron authorization
        if (!verifyCronAuth(request)) {
          return NextResponse.json({ 
            error: 'Unauthorized - Cron authentication required',
            hint: 'Set CRON_SECRET env var and use Bearer token'
          }, { status: 401 })
        }

        // Check daily budget
        const { withinBudget, postsCollectedToday } = await checkDailyBudget()
        if (!withinBudget) {
          console.log(`Daily budget limit reached: ${postsCollectedToday} posts already collected`)
          return NextResponse.json({
            success: false,
            message: 'Daily budget limit reached',
            stats: {
              posts_collected_today: postsCollectedToday,
              daily_limit: MAX_POSTS_PER_DAY,
              estimated_cost: (postsCollectedToday / 1000) * 0.5
            }
          })
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
        const remainingBudget = MAX_POSTS_PER_DAY - postsCollectedToday

        // Collect trends for each niche with rate limiting and budget control
        for (const niche of nichesToCollect) {
          // Check remaining budget
          if (totalPostsCollected >= remainingBudget) {
            console.log(`Budget exhausted after ${totalPostsCollected} posts`)
            break
          }
          
          console.log(`Collecting Instagram trends for ${niche}`)
          
          try {
            // Use Apify Instagram collector
            const { ApifyInstagramCollector } = await import('@/lib/trends/apify-instagram-collector')
            const instagramCollector = new ApifyInstagramCollector()
            
            // Calculate posts per hashtag based on remaining budget
            const hashtagsToAnalyze = getNicheHashtags(niche).slice(0, maxPerNiche)
            const postsPerHashtag = Math.min(
              200, 
              Math.floor((remainingBudget - totalPostsCollected) / hashtagsToAnalyze.length)
            )
            
            if (postsPerHashtag < 50) {
              console.log(`Skipping ${niche} - insufficient budget (${postsPerHashtag} posts/hashtag)`)
              continue
            }
            
            // Collect Instagram trends with retry logic
            let instagramTrends
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                instagramTrends = await instagramCollector.collectHashtagTrends(
                  hashtagsToAnalyze,
                  postsPerHashtag
                )
                break // Success
              } catch (error) {
                if (attempt === 3) throw error
                console.warn(`Attempt ${attempt} failed for ${niche}, retrying...`)
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
              }
            }
            
            if (!instagramTrends) continue
            
            // Convert to trend_analysis table format with proper fields
            const trendRecords = instagramTrends.map(trend => ({
              user_id: SYSTEM_USER_ID, // Use proper UUID
              platform: 'instagram',
              trend_type: 'hashtag',
              trend_name: trend.hashtag,
              niche: niche, // Add niche field
              metrics: {
                hashtag: trend.hashtag,
                postCount: trend.postCount,
                avgEngagement: trend.avgEngagement,
                totalEngagement: trend.totalEngagement,
                growthRate: trend.growthRate,
                trendingAudio: Array.from(trend.trendingAudio.entries()).slice(0, 10),
                topHashtags: []  // relatedHashtags not available from Apify collector yet
              },
              top_posts: trend.topPosts.slice(0, 5),
              // Add individual fields for querying
              growth_velocity: trend.growthRate || 0,
              current_volume: trend.postCount,
              engagement_rate: trend.avgEngagement,
              saturation_level: Math.min(100, trend.postCount / 100),
              confidence_score: (trend.growthRate || 0) > 10 ? 80 : 60,
              trend_phase: (trend.growthRate || 0) > 20 ? 'growing' : (trend.growthRate || 0) > 0 ? 'emerging' : 'declining',
              collected_at: new Date().toISOString()
            }))
            
            allTrends.push(...trendRecords)
            totalPostsCollected += hashtagsToAnalyze.length * postsPerHashtag

            // Save directly to trend_analysis table with upsert
            const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
            const supabaseAdmin = getSupabaseAdmin()
            
            const { error: insertError } = await supabaseAdmin
              .from('trend_analysis')
              .upsert(trendRecords, {
                onConflict: 'user_id,platform,trend_type,trend_name,niche,collected_at',
                ignoreDuplicates: false
              })
            
            if (insertError) {
              console.error(`Failed to save trends for ${niche}:`, insertError)
              errors.push({ niche, error: insertError.message })
            } else {
              console.log(`Saved ${trendRecords.length} trends for ${niche}`)
            }
            
            // Add delay to avoid rate limits (2 seconds between niches)
            await new Promise(resolve => setTimeout(resolve, 2000))
            
          } catch (error) {
            console.error(`Error collecting Instagram trends for ${niche}:`, error)
            errors.push({ niche, error: String(error) })
            // Continue with next niche instead of failing all
          }
        }

        // Clean up old trends with error handling
        try {
          await TrendManager.cleanupOldTrends()
        } catch (error) {
          console.error('Error cleaning up old trends:', error)
          errors.push({ task: 'cleanup', error: String(error) })
        }

        const executionTime = Date.now() - startTime
        const estimatedCost = (totalPostsCollected / 1000) * 0.5

        return NextResponse.json({
          success: errors.length === 0,
          message: `Collected ${allTrends.length} trends in ${executionTime}ms`,
          stats: {
            trends_collected: allTrends.length,
            posts_analyzed: totalPostsCollected,
            estimated_cost: estimatedCost,
            daily_budget_remaining: DAILY_BUDGET_USD - estimatedCost,
            execution_time_ms: executionTime,
            niches_processed: nichesToCollect.filter((_, i) => i * 1000 < remainingBudget).length,
            errors: errors.length
          },
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString()
        })

      } catch (error) {
        console.error('Critical trend collection error:', error)
        const executionTime = Date.now() - startTime
        
        return NextResponse.json(
          { 
            error: 'Failed to collect trends',
            message: String(error),
            stats: {
              trends_collected: 0,
              posts_analyzed: totalPostsCollected,
              execution_time_ms: executionTime,
              errors: errors.length + 1
            }
          },
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
      
      // Convert to our format with all required fields
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
        related_hashtags: [],  // Not available from current collector
        example_posts: trend.topPosts.slice(0, 3).map(p => p.caption?.substring(0, 100) || ''),
        optimal_posting_times: [9, 12, 17, 20],
        audio_trends: Array.from(trend.trendingAudio.entries()).slice(0, 5)
      }))

      return NextResponse.json({
        success: true,
        test_mode: true,
        niche,
        trends,
        count: trends.length,
        estimated_cost: (hashtagsToTest.length * 50 / 1000) * 0.5
      })

    } catch (error) {
      console.error('Test collection error:', error)
      return NextResponse.json(
        { error: 'Failed to collect test trends', details: String(error) },
        { status: 500 }
      )
    }
  })
)