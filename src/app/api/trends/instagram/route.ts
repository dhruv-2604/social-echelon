import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders, rateLimit } from '@/lib/validation/middleware'
import { z } from 'zod'
import { ApifyInstagramCollector } from '@/lib/trends/apify-instagram-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Validation schema for trend collection
const InstagramTrendSchema = z.object({
  hashtags: z.array(z.string().min(1).max(50)).min(1).max(10),
  maxPostsPerTag: z.number().min(10).max(1000).default(100),
  analysisType: z.enum(['quick', 'standard', 'deep']).default('standard')
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

        // Store trends in database
        const trendRecords = trends.map(trend => ({
          user_id: userId,
          platform: 'instagram',
          trend_type: 'hashtag',
          trend_name: trend.hashtag,
          metrics: {
            postCount: trend.postCount,
            avgEngagement: trend.avgEngagement,
            totalEngagement: trend.totalEngagement,
            growthRate: trend.growthRate,
            topAudio: Array.from(trend.trendingAudio.entries()).slice(0, 5)
          },
          top_posts: trend.topPosts.slice(0, 5),
          collected_at: new Date().toISOString()
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

        return NextResponse.json({
          success: true,
          trends: trends.map(t => ({
            hashtag: t.hashtag,
            postCount: t.postCount,
            avgEngagement: Math.round(t.avgEngagement),
            growthRate: t.growthRate?.toFixed(2),
            topAudio: Array.from(t.trendingAudio.entries()).slice(0, 3),
            topPosts: t.topPosts.slice(0, 3).map(p => ({
              url: p.url,
              likes: p.likeCount,
              owner: p.owner.username
            }))
          })),
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

// GET - Get stored Instagram trends
export const GET = withSecurityHeaders(
  withAuthAndValidation({})(async (request: NextRequest, userId: string) => {
    try {
      const supabase = getSupabaseAdmin()
      
      // Get trends from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: trends, error } = await supabase
        .from('trend_analysis')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'instagram')
        .gte('collected_at', sevenDaysAgo.toISOString())
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
  })
)