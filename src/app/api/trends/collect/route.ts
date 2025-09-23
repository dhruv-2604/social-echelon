import { NextRequest, NextResponse } from 'next/server'
import { TrendManager } from '@/lib/trends/trend-manager'
import { withSecurityHeaders, rateLimit, withAuthAndValidation } from '@/lib/validation/middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Budget limits for cost control
const DAILY_BUDGET_USD = 25 // $25 per day for comprehensive data
const MAX_POSTS_PER_DAY = 50000 // At $0.50 per 1000 posts = $25
const SYSTEM_USER_ID = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5' // Use existing user from profiles

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
          
          console.log(`Collecting trends for ${niche}`)
          
          try {
            // Collect from both Instagram and Twitter
            const { ApifyInstagramCollector } = await import('@/lib/trends/apify-instagram-collector')
            const { TwitterTrendCollector } = await import('@/lib/trends/twitter-trend-collector')
            
            const instagramCollector = new ApifyInstagramCollector()
            const twitterCollector = new TwitterTrendCollector()
            
            // Calculate posts per hashtag based on remaining budget
            // With 50k posts/day, we can do comprehensive collection
            const hashtagsToAnalyze = getNicheHashtags(niche) // Use ALL 10 hashtags per niche
            const postsPerHashtag = 500 // 500 posts per hashtag for excellent data quality
            
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
            
            // Collect Twitter trends (supplementary, doesn't count against Instagram budget)
            try {
              console.log(`📱 Collecting Twitter trends for ${niche}...`)
              const twitterHashtags = TwitterTrendCollector.getTwitterHashtags(niche)
              const twitterTrends = await twitterCollector.collectNicheTrends(
                niche,
                twitterHashtags.slice(0, 5), // Use top 5 hashtags
                {
                  maxTweets: 100,
                  minLikes: 30,    // Lower threshold for Twitter
                  minRetweets: 10,
                  daysBack: 1
                }
              )
              
              // Convert Twitter trends to database format
              const twitterRecords = twitterTrends.map(trend => ({
                user_id: SYSTEM_USER_ID,
                platform: 'twitter' as const,
                trend_type: trend.trend_type,
                trend_name: trend.trend_name,
                niche: niche,
                metrics: {
                  platform: 'twitter',
                  tweetCount: trend.tweet_count,
                  avgEngagement: trend.avg_engagement,
                  totalEngagement: trend.total_engagement,
                  growthRate: trend.growth_rate,
                  topTweets: trend.top_tweets.slice(0, 5),
                  trendingTopics: Array.from(trend.trending_topics.entries()).slice(0, 10)
                },
                top_posts: trend.top_tweets.slice(0, 5).map(t => ({
                  text: t.text,
                  engagement: t.like_count + t.retweet_count * 2,
                  url: t.url
                })),
                growth_velocity: trend.growth_rate,
                current_volume: trend.tweet_count,
                engagement_rate: trend.avg_engagement,
                saturation_level: Math.min(100, trend.tweet_count / 10),
                confidence_score: trend.confidence_score,
                trend_phase: trend.growth_rate > 50 ? 'growing' : trend.growth_rate > 0 ? 'emerging' : 'declining',
                collected_at: new Date().toISOString()
              }))
              
              allTrends.push(...twitterRecords)
              console.log(`✅ Collected ${twitterTrends.length} Twitter trends for ${niche}`)
              
            } catch (twitterError) {
              console.error(`Failed to collect Twitter trends for ${niche}:`, twitterError)
              errors.push({ niche, platform: 'twitter', error: String(twitterError) })
              // Don't fail Instagram collection if Twitter fails
            }

            // Save directly to trend_analysis table with upsert
            const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
            const supabaseAdmin = getSupabaseAdmin()
            
            // Check for existing trends today before inserting
            const today = new Date().toISOString().split('T')[0]
            const { data: existingToday } = await supabaseAdmin
              .from('trend_analysis')
              .select('trend_name')
              .eq('user_id', SYSTEM_USER_ID)
              .eq('niche', niche)
              .gte('collected_at', today)
            
            const existingTrendNames = new Set((existingToday || []).map(t => t.trend_name))
            const newRecords = trendRecords.filter(t => !existingTrendNames.has(t.trend_name))
            
            if (newRecords.length > 0) {
              const { error: insertError } = await supabaseAdmin
                .from('trend_analysis')
                .insert(newRecords)
              
              if (insertError) {
                console.error(`Failed to save trends for ${niche}:`, insertError)
                errors.push({ niche, error: insertError.message })
              } else {
                console.log(`Saved ${newRecords.length} new trends for ${niche}`)
              }
            } else {
              console.log(`All trends for ${niche} already collected today`)
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