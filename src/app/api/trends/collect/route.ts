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

// Helper to calculate growth rate from historical data
async function calculateHistoricalGrowthRate(
  trendName: string,
  currentEngagement: number,
  supabase: any
): Promise<number> {
  try {
    // Get yesterday's data for this trend
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const { data: historicalTrend } = await supabase
      .from('trend_analysis')
      .select('engagement_rate, collected_at')
      .eq('trend_name', trendName)
      .eq('user_id', SYSTEM_USER_ID)
      .gte('collected_at', twoDaysAgo.toISOString())
      .lt('collected_at', yesterday.toISOString())
      .order('collected_at', { ascending: false })
      .limit(1)
      .single()

    if (historicalTrend && (historicalTrend as any).engagement_rate > 0) {
      const previousEngagement = (historicalTrend as any).engagement_rate
      const growthRate = ((currentEngagement - previousEngagement) / previousEngagement) * 100
      // Cap at reasonable values
      return Math.max(-50, Math.min(100, growthRate))
    }

    // No historical data - return 0 (neutral) instead of fake 200%
    return 0
  } catch {
    return 0
  }
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

// Extract and save audio trends from collected trend data
async function saveAudioTrends(allTrends: any[]): Promise<void> {
  const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
  const supabase = getSupabaseAdmin()

  // Aggregate audio across all collected trends
  const audioMap = new Map<string, {
    artist: string
    track: string
    usageCount: number
    niches: Set<string>
    totalEngagement: number
    engagementSamples: number
  }>()

  for (const trend of allTrends) {
    // Skip non-Instagram trends (Twitter doesn't have audio)
    if (trend.platform !== 'instagram') continue

    // Get audio data from metrics.trendingAudio (array of [audioKey, count] pairs)
    const trendingAudio = trend.metrics?.trendingAudio || []
    const niche = trend.niche || 'general'
    const avgEngagement = trend.engagement_rate || 0

    for (const [audioKey, count] of trendingAudio) {
      // Parse "Artist - Track" format
      const parts = audioKey.split(' - ')
      const artist = parts[0] || 'Unknown'
      const track = parts.slice(1).join(' - ') || 'Unknown'

      // Create normalized key for deduplication
      const normalizedKey = audioKey.toLowerCase().trim()

      if (audioMap.has(normalizedKey)) {
        const existing = audioMap.get(normalizedKey)!
        existing.usageCount += count
        existing.niches.add(niche)
        existing.totalEngagement += avgEngagement * count
        existing.engagementSamples += count
      } else {
        audioMap.set(normalizedKey, {
          artist,
          track,
          usageCount: count,
          niches: new Set([niche]),
          totalEngagement: avgEngagement * count,
          engagementSamples: count
        })
      }
    }
  }

  // Skip if no audio data collected
  if (audioMap.size === 0) {
    console.log('📊 No audio trends to save')
    return
  }

  // Convert to database format and upsert
  const audioRecords = Array.from(audioMap.entries())
    .filter(([_, data]) => data.usageCount >= 2) // Only save audio with 2+ uses
    .map(([key, data]) => ({
      track_key: key,
      artist: data.artist.substring(0, 255),
      track: data.track.substring(0, 255),
      usage_count: data.usageCount,
      niches: Array.from(data.niches),
      avg_engagement: data.engagementSamples > 0
        ? Math.round(data.totalEngagement / data.engagementSamples)
        : 0,
      growth_rate: 0, // Will be calculated by comparing with yesterday's data
      last_updated: new Date().toISOString()
    }))

  if (audioRecords.length === 0) {
    console.log('📊 No significant audio trends (all had < 2 uses)')
    return
  }

  // Upsert to audio_trends table
  const { error } = await supabase
    .from('audio_trends')
    .upsert(audioRecords, {
      onConflict: 'track_key',
      ignoreDuplicates: false
    })

  if (error) {
    throw new Error(`Failed to save audio trends: ${error.message}`)
  }

  console.log(`📊 Saved ${audioRecords.length} audio trends to database`)
}

// Determine which niches to collect today (rotation for cron)
// At ~14 seconds per niche, we can do 5 niches safely (~70s, well under 300s timeout)
function getNichesForToday(): string[] {
  const dayOfWeek = new Date().getDay() // 0-6
  // 5 niches per day, rotating to cover all 10 across 2 days
  const nicheRotation: Record<number, string[]> = {
    0: ['fitness', 'beauty', 'lifestyle', 'fashion', 'food'], // Sunday
    1: ['travel', 'business', 'parenting', 'tech', 'education'], // Monday
    2: ['fitness', 'beauty', 'lifestyle', 'fashion', 'food'], // Tuesday
    3: ['travel', 'business', 'parenting', 'tech', 'education'], // Wednesday
    4: ['fitness', 'beauty', 'lifestyle', 'fashion', 'food'], // Thursday
    5: ['travel', 'business', 'parenting', 'tech', 'education'], // Friday
    6: ['fitness', 'beauty', 'lifestyle', 'fashion', 'food'], // Saturday
  }
  return nicheRotation[dayOfWeek] || ['fitness', 'beauty', 'lifestyle', 'fashion', 'food']
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

        // Check if this is a cron job (limited time) or manual trigger
        // Vercel cron sets this header automatically
        const isVercelCron = request.headers.get('x-vercel-cron') === '1'
        console.log(`🕐 Cron detection: isVercelCron=${isVercelCron}, header=${request.headers.get('x-vercel-cron')}`)

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

        // For cron jobs: use rotation and fewer posts to stay within timeout
        // For manual triggers: collect all niches with full data
        const nichesToCollect = validatedBody?.niches || (isVercelCron ? getNichesForToday() : SUPPORTED_NICHES)
        const maxPerNiche = validatedBody?.maxPerNiche || 5

        // Reduce posts per hashtag for cron to stay within timeout
        // Vercel Pro cron timeout is 300s, but Apify calls are slow (~6s each)
        const postsPerHashtagOverride = isVercelCron ? 30 : 500

        // Import supabase admin here so it's available for all operations below
        const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
        const supabaseAdmin = getSupabaseAdmin()

        const allTrends = []
        const remainingBudget = MAX_POSTS_PER_DAY - postsCollectedToday

        // Collect trends for each niche with rate limiting and budget control
        for (const niche of nichesToCollect) {
          // Check remaining budget
          if (totalPostsCollected >= remainingBudget) {
            break
          }
          
          
          try {
            // Collect from both Instagram and Twitter
            const { ApifyInstagramCollector } = await import('@/lib/trends/apify-instagram-collector')
            const { TwitterTrendCollector } = await import('@/lib/trends/twitter-trend-collector')
            
            const instagramCollector = new ApifyInstagramCollector()
            const twitterCollector = new TwitterTrendCollector()
            
            // Calculate posts per hashtag based on remaining budget and cron limits
            // For cron: use only 2 hashtags with 30 posts each (must complete in ~60s)
            // For manual: use all 10 hashtags with 500 posts each (comprehensive)
            const hashtagsToAnalyze = isVercelCron
              ? getNicheHashtags(niche).slice(0, 2) // Only 2 hashtags for cron (strict limit)
              : getNicheHashtags(niche) // All 10 for manual
            console.log(`📋 Processing ${hashtagsToAnalyze.length} hashtags for ${niche} (cron=${isVercelCron})`)
            const postsPerHashtag = isVercelCron ? 50 : postsPerHashtagOverride

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
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
              }
            }
            
            if (!instagramTrends) continue

            // Convert to trend_analysis table format with proper fields
            // Calculate historical growth rates for each trend
            const trendRecords = await Promise.all(instagramTrends.map(async trend => {
              const historicalGrowthRate = await calculateHistoricalGrowthRate(
                trend.hashtag,
                trend.avgEngagement,
                supabaseAdmin
              )

              return {
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
                  growthRate: historicalGrowthRate,
                  trendingAudio: Array.from(trend.trendingAudio.entries()).slice(0, 10),
                  topHashtags: []  // relatedHashtags not available from Apify collector yet
                },
                top_posts: trend.topPosts.slice(0, 5),
                // Add individual fields for querying
                growth_velocity: historicalGrowthRate,
                current_volume: trend.postCount,
                engagement_rate: trend.avgEngagement,
                saturation_level: Math.min(100, trend.postCount / 100),
                confidence_score: historicalGrowthRate > 10 ? 80 : historicalGrowthRate > 0 ? 70 : 60,
                trend_phase: historicalGrowthRate > 20 ? 'growing' : historicalGrowthRate > 0 ? 'emerging' : 'declining',
                collected_at: new Date().toISOString()
              }
            }))
            
            allTrends.push(...trendRecords)
            totalPostsCollected += hashtagsToAnalyze.length * postsPerHashtag
            
            // Collect Twitter trends (supplementary, skip for cron to save time)
            if (isVercelCron) {
              console.log(`⏩ Skipping Twitter for cron (time limit)`)
            } else try {
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

        // Extract and save audio trends from collected data
        try {
          await saveAudioTrends(allTrends)
          console.log('✅ Audio trends extracted and saved')
        } catch (error) {
          console.error('Error saving audio trends:', error)
          errors.push({ task: 'audio_trends', error: String(error) })
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