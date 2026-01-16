import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'
import { ApifyInstagramCollector } from '@/lib/trends/apify-instagram-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const SYSTEM_USER_ID = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'

// Calculate growth rate by comparing with yesterday's data (not Apify's flawed internal comparison)
async function calculateHistoricalGrowthRate(
  trendName: string,
  currentEngagement: number,
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number> {
  try {
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
      // Cap at reasonable values: -50% to +100%
      return Math.max(-50, Math.min(100, growthRate))
    }

    // No historical data - return 0 (neutral growth) instead of fake 200%
    return 0
  } catch {
    return 0
  }
}

// Validation schema for trend collection
const InstagramTrendSchema = z.object({
  hashtags: z.array(z.string().min(1).max(50)).min(1).max(10),
  maxPostsPerTag: z.number().min(10).max(1000).default(100),
  analysisType: z.enum(['quick', 'standard', 'deep']).default('standard'),
  niche: z.string().optional() // Accept niche from frontend
})

// POST - Collect Instagram trends for hashtags
export const POST = withSecurityHeaders(
  rateLimit(10, 3600000)( // 10 collections per hour
    withAuthAndValidation({
      body: InstagramTrendSchema
    })(async (request: NextRequest, userId: string, { validatedBody }) => {
      try {
        console.log('Instagram trends POST - userId:', userId)
        console.log('Instagram trends POST - body:', validatedBody)
        
        if (!validatedBody) {
          console.error('No validated body received')
          return NextResponse.json({ error: 'Request body required' }, { status: 400 })
        }

        // Check if user has premium access (for deep analysis)
        const supabase = getSupabaseAdmin()
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', userId)
          .single()

        // Use the requested amount of posts (you have Apify paid plan)
        const maxPosts = validatedBody.maxPostsPerTag || 500

        console.log(`Collecting Instagram trends for user ${userId} with ${validatedBody.hashtags.length} hashtags`)
        
        const collector = new ApifyInstagramCollector()
        const trends = await collector.collectHashtagTrends(
          validatedBody.hashtags,
          maxPosts
        )

        // Determine niche from hashtags
        const detectNiche = (hashtag: string): string => {
          const tag = hashtag.toLowerCase()
          if (['fitness', 'workout', 'gym', 'fitfam'].some(h => tag.includes(h))) return 'fitness'
          if (['beauty', 'makeup', 'skincare'].some(h => tag.includes(h))) return 'beauty'
          if (['fashion', 'style', 'ootd'].some(h => tag.includes(h))) return 'fashion'
          if (['food', 'foodie', 'recipe'].some(h => tag.includes(h))) return 'food'
          if (['lifestyle', 'aesthetic'].some(h => tag.includes(h))) return 'lifestyle'
          return 'general'
        }

        // Store trends in database with ALL required fields
        // Calculate historical growth rates for each trend (compare with yesterday's data)
        const trendRecords = await Promise.all(trends.map(async trend => {
          const historicalGrowthRate = await calculateHistoricalGrowthRate(
            trend.hashtag,
            trend.avgEngagement,
            supabase
          )

          return {
            user_id: userId,
            platform: 'instagram',
            trend_type: 'hashtag',
            trend_name: trend.hashtag,
            niche: validatedBody.niche || detectNiche(trend.hashtag), // Use passed niche or detect
            metrics: {
              hashtag: trend.hashtag,
              postCount: trend.postCount,
              avgEngagement: trend.avgEngagement,
              totalEngagement: trend.totalEngagement,
              growthRate: historicalGrowthRate, // Use historical, not Apify's flawed 200%
              trendingAudio: Array.from(trend.trendingAudio.entries()).slice(0, 5),
              topHashtags: []
            },
            top_posts: trend.topPosts.slice(0, 5),
            // Add missing fields with proper historical growth rate
            growth_velocity: historicalGrowthRate,
            current_volume: trend.postCount,
            engagement_rate: trend.avgEngagement,
            saturation_level: Math.min(100, trend.postCount / 100),
            confidence_score: historicalGrowthRate > 10 ? 80 : historicalGrowthRate > 0 ? 70 : 60,
            trend_phase: historicalGrowthRate > 20 ? 'growing' : historicalGrowthRate > 0 ? 'emerging' : 'declining',
            collected_at: new Date().toISOString()
          }
        }))

        // Save to database
        const { error: insertError } = await supabase
          .from('trend_analysis')
          .insert(trendRecords)

        if (insertError) {
          console.error('Failed to store trends:', insertError)
        }

        // Calculate cost
        const totalPosts = trends.reduce((sum, t) => sum + t.postCount, 0)
        const estimatedCost = (totalPosts * 0.0005).toFixed(4)

        // Map trends to trendRecords by hashtag for response
        const recordsByHashtag = new Map(trendRecords.map(r => [r.trend_name, r]))

        return NextResponse.json({
          success: true,
          trends: trends.map(t => {
            const record = recordsByHashtag.get(t.hashtag)
            return {
              hashtag: t.hashtag,
              postCount: t.postCount,
              avgEngagement: Math.round(t.avgEngagement),
              growthRate: (record?.growth_velocity || 0).toFixed(2), // Use historical, not Apify's
              topAudio: Array.from(t.trendingAudio.entries()).slice(0, 3),
              topPosts: t.topPosts.slice(0, 3).map(p => ({
                url: p.url,
                likes: p.likeCount,
                owner: p.owner.username
              }))
            }
          }),
          metadata: {
            totalPostsAnalyzed: totalPosts,
            estimatedCost: `$${estimatedCost}`,
            timestamp: new Date().toISOString()
          }
        })

      } catch (error) {
        console.error('Instagram trend collection error:', error)
        return NextResponse.json(
          { error: 'Failed to collect Instagram trends' },
          { status: 500 }
        )
      }
    })
  )
)

// GET - Get stored Instagram trends (global for all users)
// No auth required since these are system-wide trends
export const GET = withSecurityHeaders(
  async (request: NextRequest) => {
    try {
      const supabase = getSupabaseAdmin()

      // Get niche from query params
      const { searchParams } = new URL(request.url)
      const niche = searchParams.get('niche')
      
      // Get trends from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      // Build query
      let query = supabase
        .from('trend_analysis')
        .select('*')
        .eq('user_id', SYSTEM_USER_ID)  // Use SYSTEM_USER_ID for global trends
        .eq('platform', 'instagram')
        .gte('collected_at', sevenDaysAgo.toISOString())
      
      // Filter by niche if provided and not 'all'
      if (niche && niche !== 'all') {
        query = query.eq('niche', niche)
      }
      
      const { data: trends, error } = await query
        .order('collected_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      // Group by hashtag and find the latest for each
      const latestTrends = new Map()
      trends?.forEach((trend: any) => {
        if (!latestTrends.has(trend.trend_name) || 
            new Date(trend.collected_at) > new Date(latestTrends.get(trend.trend_name).collected_at)) {
          latestTrends.set(trend.trend_name, trend)
        }
      })

      return NextResponse.json({
        success: true,
        trends: Array.from(latestTrends.values()),
        count: latestTrends.size
      })

    } catch (error) {
      console.error('Error fetching Instagram trends:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Instagram trends' },
        { status: 500 }
      )
    }
  }
)