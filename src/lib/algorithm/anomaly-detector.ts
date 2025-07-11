import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AlgorithmChange {
  type: 'reach_drop' | 'reach_increase' | 'engagement_shift' | 'format_preference'
  metric: string
  beforeValue: number
  afterValue: number
  percentChange: number
  affectedUsers: number
  confidence: number
  niches: string[]
  recommendations: string[]
}

export class AnomalyDetector {
  private readonly MIN_USERS_THRESHOLD = 30 // Lowered from 50
  private readonly SIGNIFICANCE_THRESHOLD = 0.20 // 20% change

  /**
   * Run daily detection on aggregated data
   */
  async detectChanges(): Promise<AlgorithmChange[]> {
    console.log('Running algorithm change detection...')
    
    const changes: AlgorithmChange[] = []

    // Get data from last 7 days
    const today = new Date()
    const oneWeekAgo = new Date(today)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    // Fetch aggregated performance data
    const { data: recentData } = await supabaseAdmin
      .from('user_performance_summary')
      .select(`
        user_id,
        date,
        avg_reach,
        avg_engagement_rate,
        reel_avg_reach,
        carousel_avg_reach,
        post_avg_reach,
        profiles!inner(niche)
      `)
      .gte('date', oneWeekAgo.toISOString())
      .order('date', { ascending: false })

    const { data: previousData } = await supabaseAdmin
      .from('user_performance_summary')
      .select(`
        user_id,
        avg_reach,
        avg_engagement_rate,
        profiles!inner(niche)
      `)
      .gte('date', twoWeeksAgo.toISOString())
      .lt('date', oneWeekAgo.toISOString())

    if (!recentData || !previousData) return changes

    // 1. Check for platform-wide reach changes
    const reachChange = await this.detectReachChanges(recentData, previousData)
    if (reachChange) changes.push(reachChange)

    // 2. Check for engagement rate shifts
    const engagementChange = await this.detectEngagementChanges(recentData, previousData)
    if (engagementChange) changes.push(engagementChange)

    // 3. Check for content format preference changes
    const formatChanges = await this.detectFormatPreferences(recentData)
    changes.push(...formatChanges)

    // Save significant changes to database
    for (const change of changes) {
      if (change.confidence >= 70) {
        await this.saveChange(change)
      }
    }

    return changes
  }

  /**
   * Detect significant reach changes across users
   */
  private async detectReachChanges(
    recent: any[], 
    previous: any[]
  ): Promise<AlgorithmChange | null> {
    // Group by user and calculate averages
    const recentByUser = new Map<string, { totalReach: number; count: number; niche: string }>()
    const previousByUser = new Map<string, { totalReach: number; count: number }>()

    // Aggregate recent data
    recent.forEach(record => {
      const userId = record.user_id
      const current = recentByUser.get(userId) || { totalReach: 0, count: 0, niche: record.profiles.niche }
      current.totalReach += record.avg_reach
      current.count += 1
      recentByUser.set(userId, current)
    })

    // Aggregate previous data
    previous.forEach(record => {
      const userId = record.user_id
      const current = previousByUser.get(userId) || { totalReach: 0, count: 0 }
      current.totalReach += record.avg_reach
      current.count += 1
      previousByUser.set(userId, current)
    })

    // Calculate changes per user
    const userChanges: { userId: string; changePercent: number; niche: string }[] = []
    let totalBefore = 0
    let totalAfter = 0

    recentByUser.forEach((recentData, userId) => {
      const prevData = previousByUser.get(userId)
      if (!prevData || prevData.count === 0) return

      const recentAvg = recentData.totalReach / recentData.count
      const prevAvg = prevData.totalReach / prevData.count
      const changePercent = (recentAvg - prevAvg) / prevAvg

      if (Math.abs(changePercent) >= this.SIGNIFICANCE_THRESHOLD) {
        userChanges.push({ userId, changePercent, niche: recentData.niche })
        totalBefore += prevAvg
        totalAfter += recentAvg
      }
    })

    // Check if enough users are affected
    if (userChanges.length < this.MIN_USERS_THRESHOLD) return null

    // Calculate overall change
    const overallChange = (totalAfter - totalBefore) / totalBefore
    const affectedNiches = [...new Set(userChanges.map(u => u.niche))]

    // Determine type and recommendations
    const isIncrease = overallChange > 0
    const recommendations = isIncrease ? [
      'Instagram is favoring more content - increase posting frequency',
      'Test new content formats while reach is high',
      'Engage more with your audience to maintain momentum'
    ] : [
      'Focus on high-quality content over quantity',
      'Increase engagement with your existing audience',
      'Try posting at different times to find new optimal windows'
    ]

    return {
      type: isIncrease ? 'reach_increase' : 'reach_drop',
      metric: 'average_reach',
      beforeValue: Math.round(totalBefore / userChanges.length),
      afterValue: Math.round(totalAfter / userChanges.length),
      percentChange: Number((overallChange * 100).toFixed(1)),
      affectedUsers: userChanges.length,
      confidence: this.calculateConfidence(userChanges.length, Math.abs(overallChange)),
      niches: affectedNiches,
      recommendations
    }
  }

  /**
   * Detect engagement rate changes
   */
  private async detectEngagementChanges(
    recent: any[], 
    previous: any[]
  ): Promise<AlgorithmChange | null> {
    // Similar logic but for engagement_rate
    const recentEngagement = recent.reduce((sum, r) => sum + r.avg_engagement_rate, 0) / recent.length
    const prevEngagement = previous.reduce((sum, r) => sum + r.avg_engagement_rate, 0) / previous.length
    
    const change = (recentEngagement - prevEngagement) / prevEngagement

    if (Math.abs(change) < 0.15) return null // 15% threshold for engagement

    return {
      type: 'engagement_shift',
      metric: 'engagement_rate',
      beforeValue: Number(prevEngagement.toFixed(2)),
      afterValue: Number(recentEngagement.toFixed(2)),
      percentChange: Number((change * 100).toFixed(1)),
      affectedUsers: recent.length,
      confidence: 75,
      niches: [],
      recommendations: change > 0 ? [
        'Your content is resonating better - analyze what changed',
        'Saves and shares are becoming more valuable'
      ] : [
        'Focus on creating more engaging, saveable content',
        'Ask questions to encourage comments',
        'Create content that provides value'
      ]
    }
  }

  /**
   * Detect content format preference changes
   */
  private async detectFormatPreferences(recent: any[]): Promise<AlgorithmChange[]> {
    const changes: AlgorithmChange[] = []
    
    // Calculate average reach by format
    const formats = ['reel', 'carousel', 'post']
    const formatPerformance: Record<string, { total: number; count: number }> = {}

    recent.forEach(record => {
      if (record.reel_avg_reach && record.reel_avg_reach > 0) {
        if (!formatPerformance.reel) formatPerformance.reel = { total: 0, count: 0 }
        formatPerformance.reel.total += record.reel_avg_reach
        formatPerformance.reel.count += 1
      }
      if (record.carousel_avg_reach && record.carousel_avg_reach > 0) {
        if (!formatPerformance.carousel) formatPerformance.carousel = { total: 0, count: 0 }
        formatPerformance.carousel.total += record.carousel_avg_reach
        formatPerformance.carousel.count += 1
      }
      if (record.post_avg_reach && record.post_avg_reach > 0) {
        if (!formatPerformance.post) formatPerformance.post = { total: 0, count: 0 }
        formatPerformance.post.total += record.post_avg_reach
        formatPerformance.post.count += 1
      }
    })

    // Find best performing format
    let bestFormat = ''
    let bestReach = 0

    Object.entries(formatPerformance).forEach(([format, data]) => {
      const avgReach = data.total / data.count
      if (avgReach > bestReach) {
        bestReach = avgReach
        bestFormat = format
      }
    })

    if (bestFormat && formatPerformance[bestFormat].count >= 20) {
      // Calculate how much better it performs
      const otherFormats = Object.entries(formatPerformance)
        .filter(([f]) => f !== bestFormat)
        .map(([_, data]) => data.total / data.count)
      
      const avgOtherReach = otherFormats.reduce((sum, r) => sum + r, 0) / otherFormats.length
      const improvement = ((bestReach - avgOtherReach) / avgOtherReach) * 100

      if (improvement > 25) {
        changes.push({
          type: 'format_preference',
          metric: `${bestFormat}_performance`,
          beforeValue: Math.round(avgOtherReach),
          afterValue: Math.round(bestReach),
          percentChange: Number(improvement.toFixed(1)),
          affectedUsers: formatPerformance[bestFormat].count,
          confidence: 80,
          niches: [],
          recommendations: [
            `${bestFormat}s are performing ${improvement.toFixed(0)}% better than other formats`,
            `Increase ${bestFormat} content to 60% of your content mix`,
            `Study what makes your ${bestFormat}s successful`
          ]
        })
      }
    }

    return changes
  }

  /**
   * Calculate confidence based on sample size and effect size
   */
  private calculateConfidence(sampleSize: number, effectSize: number): number {
    const sampleScore = Math.min(50, (sampleSize / this.MIN_USERS_THRESHOLD) * 40)
    const effectScore = Math.min(50, Math.abs(effectSize) * 150)
    return Math.round(sampleScore + effectScore)
  }

  /**
   * Save detected change to database
   */
  private async saveChange(change: AlgorithmChange): Promise<void> {
    await supabaseAdmin
      .from('algorithm_changes')
      .insert({
        change_type: change.type,
        metric_name: change.metric,
        before_value: change.beforeValue,
        after_value: change.afterValue,
        percent_change: change.percentChange,
        affected_users_count: change.affectedUsers,
        sample_size: change.affectedUsers,
        confidence_score: change.confidence,
        niches_affected: change.niches,
        recommendations: change.recommendations,
        status: 'detected'
      })
  }
}