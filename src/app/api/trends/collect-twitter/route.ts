import { NextRequest, NextResponse } from 'next/server'
import { TwitterTrendCollector } from '@/lib/trends/twitter-trend-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { withAuthAndValidation } from '@/lib/validation/middleware'

// Manual Twitter trend collection endpoint
// Since you're on Vercel Hobby plan with only 2 cron jobs

const SYSTEM_USER_ID = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5' // Your existing user

export const POST = withAuthAndValidation({})(
  async (request: NextRequest, userId: string) => {
    try {
      // Parse request body for niche selection
      const body = await request.json().catch(() => ({}))
      const { niche = 'all', test = false } = body
      
      // Check if user is admin or the system user
      const supabaseAdmin = getSupabaseAdmin()
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (profile?.role !== 'admin' && userId !== SYSTEM_USER_ID) {
        return NextResponse.json({ 
          error: 'Admin access required for Twitter trend collection' 
        }, { status: 403 })
      }
      
      console.log(`🐦 Manual Twitter trend collection started for ${niche}`)
      
      // Check if APIFY_TOKEN is configured
      if (!process.env.APIFY_TOKEN) {
        return NextResponse.json({ 
          error: 'APIFY_TOKEN not configured. Add it to your Vercel environment variables.',
          hint: 'The same token works for both Instagram and Twitter scrapers'
        }, { status: 500 })
      }
      
      const collector = new TwitterTrendCollector()
      const allTrends = []
      const errors = []
      
      // Determine which niches to collect
      const nichesToCollect = niche === 'all' 
        ? ['fitness', 'beauty', 'fashion', 'lifestyle', 'food']
        : [niche]
      
      // Collect trends for each niche
      for (const currentNiche of nichesToCollect) {
        try {
          console.log(`Collecting Twitter trends for ${currentNiche}...`)
          
          const hashtags = TwitterTrendCollector.getTwitterHashtags(currentNiche)
          const options = test 
            ? { maxTweets: 20, minLikes: 10, minRetweets: 5, daysBack: 1 }
            : { maxTweets: 100, minLikes: 30, minRetweets: 10, daysBack: 1 }
          
          const trends = await collector.collectNicheTrends(
            currentNiche,
            hashtags.slice(0, 5),
            options
          )
          
          // Convert to database format
          const trendRecords = trends.map(trend => ({
            user_id: SYSTEM_USER_ID,
            platform: 'twitter',
            trend_type: trend.trend_type,
            trend_name: trend.trend_name,
            niche: currentNiche,
            metrics: {
              platform: 'twitter',
              tweetCount: trend.tweet_count,
              avgEngagement: trend.avg_engagement,
              totalEngagement: trend.total_engagement,
              growthRate: trend.growth_rate,
              topTweets: trend.top_tweets.slice(0, 5),
              trendingTopics: Array.from(trend.trending_topics.entries()).slice(0, 10),
              confidence: trend.confidence_score
            },
            top_posts: trend.top_tweets.slice(0, 3).map(t => ({
              text: t.text.substring(0, 200),
              engagement: t.like_count + t.retweet_count * 2,
              url: t.url,
              author: t.user.username
            })),
            growth_velocity: trend.growth_rate,
            current_volume: trend.tweet_count,
            engagement_rate: trend.avg_engagement,
            saturation_level: Math.min(100, trend.tweet_count / 10),
            confidence_score: trend.confidence_score,
            trend_phase: trend.growth_rate > 50 ? 'growing' : trend.growth_rate > 0 ? 'emerging' : 'declining',
            collected_at: new Date().toISOString()
          }))
          
          // Save to database
          if (!test && trendRecords.length > 0) {
            // Check for existing trends today
            const today = new Date().toISOString().split('T')[0]
            const { data: existingToday } = await supabaseAdmin
              .from('trend_analysis')
              .select('trend_name')
              .eq('user_id', SYSTEM_USER_ID)
              .eq('platform', 'twitter')
              .eq('niche', currentNiche)
              .gte('collected_at', today)
            
            const existingNames = new Set((existingToday || []).map(t => t.trend_name))
            const newRecords = trendRecords.filter(t => !existingNames.has(t.trend_name))
            
            if (newRecords.length > 0) {
              const { error: insertError } = await supabaseAdmin
                .from('trend_analysis')
                .insert(newRecords)
              
              if (insertError) {
                console.error(`Failed to save Twitter trends for ${currentNiche}:`, insertError)
                errors.push({ niche: currentNiche, error: insertError.message })
              } else {
                console.log(`Saved ${newRecords.length} Twitter trends for ${currentNiche}`)
              }
            }
          }
          
          allTrends.push(...trendRecords)
          
        } catch (error) {
          console.error(`Error collecting Twitter trends for ${currentNiche}:`, error)
          errors.push({ niche: currentNiche, error: String(error) })
        }
      }
      
      // Get cross-platform analysis
      const { CrossPlatformAnalyzer } = await import('@/lib/trends/cross-platform-analyzer')
      const crossPlatformInsights = await CrossPlatformAnalyzer.getCrossPlatformTrends(
        niche === 'all' ? undefined : niche,
        10
      )
      
      // Get trend alerts
      const alerts = await CrossPlatformAnalyzer.getTrendAlerts()
      
      return NextResponse.json({
        success: errors.length === 0,
        message: `Collected ${allTrends.length} Twitter trends`,
        stats: {
          trends_collected: allTrends.length,
          niches_processed: nichesToCollect.length,
          errors: errors.length,
          test_mode: test
        },
        trends: test ? allTrends.slice(0, 5) : undefined, // Show sample in test mode
        cross_platform_insights: crossPlatformInsights.slice(0, 5),
        alerts: alerts.filter(a => a.urgency === 'HIGH'),
        errors: errors.length > 0 ? errors : undefined
      })
      
    } catch (error) {
      console.error('Twitter collection error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to collect Twitter trends',
          details: String(error)
        },
        { status: 500 }
      )
    }
  }
)

// GET endpoint for testing connection
export const GET = withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
  return NextResponse.json({
    message: 'Twitter trend collection endpoint',
    usage: 'POST with { niche: "fitness" | "beauty" | "all", test: true/false }',
    requirements: [
      'Must be authenticated',
      'Must be admin or system user',
      'APIFY_TOKEN must be configured'
    ],
    available_niches: ['fitness', 'beauty', 'fashion', 'lifestyle', 'food'],
    note: 'Use test:true for small sample collection without saving to DB'
  })
})