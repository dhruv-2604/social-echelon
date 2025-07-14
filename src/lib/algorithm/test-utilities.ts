import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class AlgorithmTestUtilities {
  /**
   * Simulate an algorithm change by modifying user performance data
   * This is for testing purposes only
   */
  static async simulateReachDrop(
    affectedNiches: string[] = ['fashion', 'lifestyle'],
    percentDrop: number = 25,
    affectedUserCount: number = 35
  ) {
    console.log(`Simulating ${percentDrop}% reach drop for ${affectedUserCount} users...`)
    
    // Get users from specified niches
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .in('niche', affectedNiches)
      .limit(affectedUserCount)
    
    if (!users || users.length === 0) {
      console.error('No users found to simulate change')
      return
    }
    
    const today = new Date()
    const promises = []
    
    for (const user of users) {
      // Create performance data showing a drop
      const beforeReach = Math.floor(Math.random() * 5000) + 1000
      const afterReach = Math.floor(beforeReach * (1 - percentDrop / 100))
      
      // Insert recent data with lower reach
      promises.push(
        supabaseAdmin.from('user_performance_summary').insert({
          user_id: user.id,
          date: today.toISOString().split('T')[0],
          avg_reach: afterReach,
          avg_impressions: afterReach * 1.2,
          avg_likes: Math.floor(afterReach * 0.05),
          avg_comments: Math.floor(afterReach * 0.01),
          avg_saves: Math.floor(afterReach * 0.005),
          avg_shares: Math.floor(afterReach * 0.002),
          avg_engagement_rate: 5.5,
          total_posts: 3,
          reel_count: 1,
          carousel_count: 1,
          post_count: 1,
          reel_avg_reach: afterReach * 1.3,
          carousel_avg_reach: afterReach * 0.9,
          post_avg_reach: afterReach * 0.7
        })
      )
      
      // Insert historical data with higher reach (7 days ago)
      const historicalDate = new Date(today)
      historicalDate.setDate(historicalDate.getDate() - 7)
      
      promises.push(
        supabaseAdmin.from('user_performance_summary').insert({
          user_id: user.id,
          date: historicalDate.toISOString().split('T')[0],
          avg_reach: beforeReach,
          avg_impressions: beforeReach * 1.2,
          avg_likes: Math.floor(beforeReach * 0.06),
          avg_comments: Math.floor(beforeReach * 0.015),
          avg_saves: Math.floor(beforeReach * 0.007),
          avg_shares: Math.floor(beforeReach * 0.003),
          avg_engagement_rate: 6.5,
          total_posts: 3,
          reel_count: 1,
          carousel_count: 1,
          post_count: 1,
          reel_avg_reach: beforeReach * 1.3,
          carousel_avg_reach: beforeReach * 0.9,
          post_avg_reach: beforeReach * 0.7
        })
      )
    }
    
    await Promise.all(promises)
    console.log(`Simulated reach drop for ${users.length} users`)
  }
  
  /**
   * Simulate a format preference change (e.g., Reels performing better)
   */
  static async simulateFormatPreference(
    preferredFormat: 'reel' | 'carousel' | 'post' = 'reel',
    performanceBoost: number = 40
  ) {
    console.log(`Simulating ${preferredFormat} preference with ${performanceBoost}% boost...`)
    
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(50)
    
    if (!users || users.length === 0) {
      console.error('No users found to simulate change')
      return
    }
    
    const today = new Date()
    const promises = []
    
    for (const user of users) {
      const baseReach = Math.floor(Math.random() * 3000) + 1000
      
      // Calculate reach for each format
      const reelReach = preferredFormat === 'reel' 
        ? Math.floor(baseReach * (1 + performanceBoost / 100))
        : baseReach
      const carouselReach = preferredFormat === 'carousel'
        ? Math.floor(baseReach * (1 + performanceBoost / 100))
        : Math.floor(baseReach * 0.8)
      const postReach = preferredFormat === 'post'
        ? Math.floor(baseReach * (1 + performanceBoost / 100))
        : Math.floor(baseReach * 0.6)
      
      promises.push(
        supabaseAdmin.from('user_performance_summary').insert({
          user_id: user.id,
          date: today.toISOString().split('T')[0],
          avg_reach: Math.floor((reelReach + carouselReach + postReach) / 3),
          avg_impressions: Math.floor((reelReach + carouselReach + postReach) / 3 * 1.2),
          avg_likes: Math.floor(baseReach * 0.05),
          avg_comments: Math.floor(baseReach * 0.01),
          avg_saves: Math.floor(baseReach * 0.005),
          avg_shares: Math.floor(baseReach * 0.002),
          avg_engagement_rate: 5.5,
          total_posts: 3,
          reel_count: 1,
          carousel_count: 1,
          post_count: 1,
          reel_avg_reach: reelReach,
          carousel_avg_reach: carouselReach,
          post_avg_reach: postReach
        })
      )
    }
    
    await Promise.all(promises)
    console.log(`Simulated format preference for ${users.length} users`)
  }
  
  /**
   * Clean up test data older than specified days
   */
  static async cleanupTestData(daysToKeep: number = 7) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const { error } = await supabaseAdmin
      .from('user_performance_summary')
      .delete()
      .lt('date', cutoffDate.toISOString().split('T')[0])
    
    if (error) {
      console.error('Error cleaning up test data:', error)
    } else {
      console.log(`Cleaned up test data older than ${daysToKeep} days`)
    }
  }
  
  /**
   * Generate realistic performance data for testing
   */
  static async generateRealisticData(dayCount: number = 14) {
    console.log(`Generating ${dayCount} days of realistic performance data...`)
    
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('id, follower_count')
      .limit(100)
    
    if (!users || users.length === 0) {
      console.error('No users found')
      return
    }
    
    const promises = []
    const today = new Date()
    
    for (const user of users) {
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        
        // Generate realistic metrics based on follower count
        const followerCount = user.follower_count || 1000
        const baseReach = Math.floor(followerCount * (Math.random() * 0.3 + 0.2)) // 20-50% of followers
        
        // Add daily variation (-20% to +20%)
        const dailyVariation = (Math.random() * 0.4 - 0.2) + 1
        const reach = Math.floor(baseReach * dailyVariation)
        
        // Add day-of-week effects (weekends slightly lower)
        const dayOfWeek = date.getDay()
        const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1
        const adjustedReach = Math.floor(reach * weekendFactor)
        
        promises.push(
          supabaseAdmin.from('user_performance_summary').insert({
            user_id: user.id,
            date: date.toISOString().split('T')[0],
            avg_reach: adjustedReach,
            avg_impressions: Math.floor(adjustedReach * 1.3),
            avg_likes: Math.floor(adjustedReach * 0.055), // 5.5% engagement
            avg_comments: Math.floor(adjustedReach * 0.012),
            avg_saves: Math.floor(adjustedReach * 0.006),
            avg_shares: Math.floor(adjustedReach * 0.003),
            avg_engagement_rate: 5.5 + (Math.random() * 2 - 1), // 4.5-6.5%
            total_posts: Math.floor(Math.random() * 3) + 1, // 1-3 posts
            reel_count: Math.random() > 0.5 ? 1 : 0,
            carousel_count: Math.random() > 0.6 ? 1 : 0,
            post_count: Math.random() > 0.7 ? 1 : 0,
            reel_avg_reach: Math.floor(adjustedReach * 1.4), // Reels typically reach more
            carousel_avg_reach: Math.floor(adjustedReach * 0.9),
            post_avg_reach: Math.floor(adjustedReach * 0.7)
          })
        )
      }
    }
    
    await Promise.all(promises)
    console.log(`Generated ${dayCount} days of data for ${users.length} users`)
  }
}