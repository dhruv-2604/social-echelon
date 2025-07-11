import { createClient } from '@supabase/supabase-js'
import { InstagramAPI } from '@/lib/instagram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DailyPerformance {
  user_id: string
  date: string
  avg_reach: number
  avg_impressions: number
  avg_likes: number
  avg_comments: number
  avg_saves: number
  total_posts: number
  avg_engagement_rate: number
  follower_count: number
  reel_avg_reach?: number
  carousel_avg_reach?: number
  post_avg_reach?: number
}

export class PerformanceCollector {
  /**
   * Collect daily performance summary for a user
   * Runs once per day, not hourly!
   */
  async collectDailySummary(userId: string): Promise<DailyPerformance | null> {
    console.log(`Collecting daily summary for user ${userId}`)
    
    try {
      // Get user's Instagram access token
      const { data: tokenData } = await supabaseAdmin
        .from('user_tokens')
        .select('instagram_access_token')
        .eq('user_id', userId)
        .single()

      if (!tokenData?.instagram_access_token) {
        console.error(`No Instagram token for user ${userId}`)
        return null
      }

      // Get current follower count
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('follower_count')
        .eq('id', userId)
        .single()

      if (!profile) return null

      // Get Instagram posts from last 7 days
      const instagram = new InstagramAPI(tokenData.instagram_access_token)
      const media = await instagram.getMedia(25) // Get recent posts
      
      // Filter to only posts from last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentPosts = media.filter(post => 
        new Date(post.timestamp) > sevenDaysAgo
      )

      if (recentPosts.length === 0) {
        console.log(`No recent posts for user ${userId}`)
        return null
      }

      // Calculate averages from REAL Instagram data only
      let totalReach = 0
      let totalImpressions = 0
      let totalLikes = 0
      let totalComments = 0
      let totalSaves = 0

      // Track by content type
      const performanceByType: Record<string, { reach: number; count: number }> = {
        reel: { reach: 0, count: 0 },
        carousel: { reach: 0, count: 0 },
        post: { reach: 0, count: 0 }
      }

      // Get insights for each post
      for (const post of recentPosts) {
        try {
          const insights = await instagram.getInsights(post.id)
          
          // Only use REAL data from Instagram
          totalReach += insights.reach || 0
          totalImpressions += insights.impressions || 0
          totalSaves += insights.saved || 0
          totalLikes += post.like_count || 0
          totalComments += post.comments_count || 0

          // Track by type
          let type = 'post'
          if (post.media_type === 'VIDEO' || post.media_type === 'REELS') {
            type = 'reel'
          } else if (post.media_type === 'CAROUSEL_ALBUM') {
            type = 'carousel'
          }

          performanceByType[type].reach += insights.reach || 0
          performanceByType[type].count += 1

        } catch (error) {
          console.error(`Error getting insights for post ${post.id}:`, error)
        }
      }

      // Calculate averages
      const postCount = recentPosts.length
      const avgReach = Math.round(totalReach / postCount)
      const avgEngagementRate = avgReach > 0 
        ? ((totalLikes + totalComments + totalSaves) / postCount) / avgReach * 100
        : 0

      const summary: DailyPerformance = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0], // Today's date
        avg_reach: avgReach,
        avg_impressions: Math.round(totalImpressions / postCount),
        avg_likes: Math.round(totalLikes / postCount),
        avg_comments: Math.round(totalComments / postCount),
        avg_saves: Math.round(totalSaves / postCount),
        total_posts: postCount,
        avg_engagement_rate: Number(avgEngagementRate.toFixed(2)),
        follower_count: profile.follower_count
      }

      // Add content type performance if we have data
      if (performanceByType.reel.count > 0) {
        summary.reel_avg_reach = Math.round(performanceByType.reel.reach / performanceByType.reel.count)
      }
      if (performanceByType.carousel.count > 0) {
        summary.carousel_avg_reach = Math.round(performanceByType.carousel.reach / performanceByType.carousel.count)
      }
      if (performanceByType.post.count > 0) {
        summary.post_avg_reach = Math.round(performanceByType.post.reach / performanceByType.post.count)
      }

      // Store in database (upsert to avoid duplicates)
      const { error } = await supabaseAdmin
        .from('user_performance_summary')
        .upsert(summary, { onConflict: 'user_id,date' })

      if (error) {
        console.error('Error storing summary:', error)
        return null
      }

      console.log(`Stored daily summary for user ${userId}:`, {
        avg_reach: summary.avg_reach,
        total_posts: summary.total_posts,
        engagement_rate: summary.avg_engagement_rate
      })

      return summary

    } catch (error) {
      console.error(`Error collecting summary for user ${userId}:`, error)
      return null
    }
  }

  /**
   * Collect summaries for all active users
   * Should run ONCE per day, not hourly
   */
  async collectAllUsersSummaries(): Promise<void> {
    console.log('Starting daily performance collection')
    
    // Get all users with Instagram tokens
    const { data: users } = await supabaseAdmin
      .from('user_tokens')
      .select('user_id')
      .not('instagram_access_token', 'is', null)

    if (!users) return

    console.log(`Processing ${users.length} users`)

    // Process in small batches
    const batchSize = 5
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(user => this.collectDailySummary(user.user_id))
      )
      
      // Longer delay between batches since this runs daily
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }

    console.log('Completed daily performance collection')
  }

  /**
   * Get user's performance trend (last 7 days)
   */
  async getUserTrend(userId: string): Promise<{
    trend: 'improving' | 'stable' | 'declining'
    reachChange: number
    engagementChange: number
  }> {
    const { data } = await supabaseAdmin
      .from('user_performance_summary')
      .select('date, avg_reach, avg_engagement_rate')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: true })

    if (!data || data.length < 2) {
      return { trend: 'stable', reachChange: 0, engagementChange: 0 }
    }

    // Compare first half vs second half of week
    const midPoint = Math.floor(data.length / 2)
    const firstHalf = data.slice(0, midPoint)
    const secondHalf = data.slice(midPoint)

    const firstAvgReach = firstHalf.reduce((sum, d) => sum + d.avg_reach, 0) / firstHalf.length
    const secondAvgReach = secondHalf.reduce((sum, d) => sum + d.avg_reach, 0) / secondHalf.length

    const reachChange = ((secondAvgReach - firstAvgReach) / firstAvgReach) * 100

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable'
    if (reachChange > 10) trend = 'improving'
    else if (reachChange < -10) trend = 'declining'

    return {
      trend,
      reachChange: Number(reachChange.toFixed(1)),
      engagementChange: 0 // Could calculate this too
    }
  }
}