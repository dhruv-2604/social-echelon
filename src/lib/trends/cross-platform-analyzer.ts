import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface CrossPlatformTrend {
  trend_name: string
  niche: string
  instagram_score: number | null
  twitter_score: number | null
  combined_score: number
  trending_both: boolean
  instagram_growth: number | null
  twitter_growth: number | null
  recommendation: string
  predicted_virality: number
  best_time_to_post: string
}

export interface TrendAlert {
  alert_type: 'CROSS_PLATFORM_HOT' | 'TWITTER_EMERGING' | 'INSTAGRAM_DECLINING' | 'OPPORTUNITY'
  trend_name: string
  niche: string
  message: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  platforms: string[]
  action_required: string
}

export class CrossPlatformAnalyzer {
  
  /**
   * Get cross-platform trends with recommendations
   */
  static async getCrossPlatformTrends(
    niche?: string,
    limit: number = 20
  ): Promise<CrossPlatformTrend[]> {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Call the database function we created
    const { data, error } = await supabaseAdmin
      .rpc('get_cross_platform_trends', {
        p_niche: niche,
        p_limit: limit
      })
    
    if (error) {
      console.error('Error fetching cross-platform trends:', error)
      return []
    }
    
    // Enhance with additional analysis
    return ((data as any[]) || []).map(trend => ({
      ...trend,
      predicted_virality: this.calculateVirality(trend),
      best_time_to_post: this.calculateBestPostTime(trend)
    }))
  }
  
  /**
   * Get trend alerts for immediate action
   */
  static async getTrendAlerts(): Promise<TrendAlert[]> {
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin
      .rpc('get_trend_alerts')
    
    if (error) {
      console.error('Error fetching trend alerts:', error)
      return []
    }
    
    // Add action recommendations
    return ((data as any[]) || []).map(alert => ({
      ...alert,
      action_required: this.getActionForAlert(alert)
    }))
  }
  
  /**
   * Predict Instagram performance from Twitter trends
   */
  static async predictInstagramFromTwitter(
    daysOffset: number = 3
  ): Promise<Array<{
    trend_name: string
    niche: string
    predicted_score: number
    confidence: number
    action: string
  }>> {
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data, error } = await supabaseAdmin
      .rpc('predict_instagram_from_twitter', {
        p_days_offset: daysOffset
      })
    
    if (error) {
      console.error('Error predicting Instagram trends:', error)
      return []
    }
    
    return (data as any[]) || []
  }
  
  /**
   * Analyze trend velocity across platforms
   */
  static async analyzeTrendVelocity(trendName: string, niche: string): Promise<{
    twitter_velocity: number | null
    instagram_velocity: number | null
    acceleration: number
    peak_prediction: string
    lifecycle_stage: 'emerging' | 'accelerating' | 'peak' | 'declining'
  }> {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get last 7 days of data
    const { data: trendHistory } = await supabaseAdmin
      .from('trend_analysis')
      .select('platform, growth_velocity, confidence_score, collected_at')
      .eq('trend_name', trendName)
      .eq('niche', niche)
      .gte('collected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('collected_at', { ascending: true })
    
    if (!trendHistory || trendHistory.length === 0) {
      return {
        twitter_velocity: null,
        instagram_velocity: null,
        acceleration: 0,
        peak_prediction: 'Unknown',
        lifecycle_stage: 'emerging'
      }
    }
    
    // Separate by platform
    const twitterData = trendHistory.filter(t => t.platform === 'twitter')
    const instagramData = trendHistory.filter(t => t.platform === 'instagram')
    
    // Calculate current velocities
    const twitter_velocity = twitterData.length > 0 
      ? (twitterData[twitterData.length - 1] as any).growth_velocity 
      : null
    
    const instagram_velocity = instagramData.length > 0
      ? (instagramData[instagramData.length - 1] as any).growth_velocity
      : null
    
    // Calculate acceleration (rate of change of velocity)
    let acceleration = 0
    if (twitterData.length >= 2) {
      const recent = (twitterData[twitterData.length - 1] as any).growth_velocity
      const previous = (twitterData[twitterData.length - 2] as any).growth_velocity
      acceleration = recent - previous
    }
    
    // Predict peak
    const peak_prediction = this.predictPeak(twitter_velocity, instagram_velocity, acceleration)
    
    // Determine lifecycle stage
    const lifecycle_stage = this.determineLifecycleStage(
      twitter_velocity || 0,
      instagram_velocity || 0,
      acceleration
    )
    
    return {
      twitter_velocity,
      instagram_velocity,
      acceleration,
      peak_prediction,
      lifecycle_stage
    }
  }
  
  /**
   * Get content recommendations based on cross-platform trends
   */
  static async getContentRecommendations(
    niche: string,
    creatorStyle?: 'educational' | 'entertainment' | 'lifestyle' | 'promotional'
  ): Promise<Array<{
    trend: string
    content_idea: string
    format: 'reel' | 'carousel' | 'post' | 'story'
    urgency: 'high' | 'medium' | 'low'
    estimated_engagement: number
  }>> {
    const trends = await this.getCrossPlatformTrends(niche, 10)
    
    const recommendations = []
    
    for (const trend of trends) {
      // Skip low confidence trends
      if (trend.combined_score < 50) continue
      
      const content_idea = this.generateContentIdea(trend, creatorStyle)
      const format = this.recommendFormat(trend)
      const urgency = this.calculateUrgency(trend)
      const estimated_engagement = this.estimateEngagement(trend)
      
      recommendations.push({
        trend: trend.trend_name,
        content_idea,
        format,
        urgency,
        estimated_engagement
      })
    }
    
    return recommendations.sort((a, b) => {
      // Sort by urgency then by estimated engagement
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      }
      return b.estimated_engagement - a.estimated_engagement
    })
  }
  
  // Helper methods
  
  private static calculateVirality(trend: any): number {
    let virality = 50 // Base score
    
    // Both platforms trending = higher virality
    if (trend.trending_both) virality += 30
    
    // High growth on either platform
    if ((trend.instagram_growth || 0) > 50 || (trend.twitter_growth || 0) > 50) virality += 20
    
    // High confidence scores
    if ((trend.instagram_score || 0) > 80) virality += 10
    if ((trend.twitter_score || 0) > 80) virality += 10
    
    return Math.min(100, virality)
  }
  
  private static calculateBestPostTime(trend: any): string {
    // Twitter trends typically peak 3-5 days before Instagram
    if ((trend.twitter_score || 0) > (trend.instagram_score || 0)) {
      return 'Next 48 hours'
    } else if ((trend.instagram_growth || 0) > 50) {
      return 'Immediately'
    } else if (trend.trending_both) {
      return 'Within 24 hours'
    } else {
      return 'Next 3-5 days'
    }
  }
  
  private static getActionForAlert(alert: any): string {
    switch (alert.alert_type) {
      case 'CROSS_PLATFORM_HOT':
        return 'Create content immediately - ride the wave'
      case 'TWITTER_EMERGING':
        return 'Prepare Instagram content for next 3 days'
      case 'INSTAGRAM_DECLINING':
        return 'Pivot to new trend or refresh approach'
      default:
        return 'Monitor and prepare content'
    }
  }
  
  private static predictPeak(
    twitterVelocity: number | null,
    instagramVelocity: number | null,
    acceleration: number
  ): string {
    if (!twitterVelocity && !instagramVelocity) return 'No data'
    
    if (acceleration > 20) return '1-2 days'
    if (acceleration > 10) return '3-5 days'
    if (acceleration > 0) return '1 week'
    if (acceleration < -10) return 'Already peaked'
    
    return '5-7 days'
  }
  
  private static determineLifecycleStage(
    twitterVelocity: number,
    instagramVelocity: number,
    acceleration: number
  ): 'emerging' | 'accelerating' | 'peak' | 'declining' {
    if (twitterVelocity < 0 && instagramVelocity < 0) return 'declining'
    if (acceleration > 20) return 'accelerating'
    if (twitterVelocity > 50 || instagramVelocity > 50) return 'peak'
    return 'emerging'
  }
  
  private static generateContentIdea(
    trend: CrossPlatformTrend,
    style?: string
  ): string {
    const baseIdea = `${trend.trend_name} content`
    
    if (style === 'educational') {
      return `"5 things you didn't know about ${trend.trend_name}"`
    } else if (style === 'entertainment') {
      return `"${trend.trend_name} challenge/trend recreation"`
    } else if (style === 'lifestyle') {
      return `"My take on ${trend.trend_name}"`
    } else {
      return `"Why ${trend.trend_name} is trending now"`
    }
  }
  
  private static recommendFormat(trend: CrossPlatformTrend): 'reel' | 'carousel' | 'post' | 'story' {
    // High velocity trends work best as Reels
    if ((trend.instagram_growth || 0) > 50 || (trend.twitter_growth || 0) > 50) {
      return 'reel'
    }
    
    // Educational/informative trends work as carousels
    if (trend.trend_name.includes('how') || trend.trend_name.includes('tips')) {
      return 'carousel'
    }
    
    // Quick updates as stories
    if ((trend.twitter_score || 0) > (trend.instagram_score || 0)) {
      return 'story'
    }
    
    return 'post'
  }
  
  private static calculateUrgency(trend: CrossPlatformTrend): 'high' | 'medium' | 'low' {
    if (trend.trending_both && trend.combined_score > 80) return 'high'
    if ((trend.twitter_growth || 0) > 100) return 'high'
    if ((trend.instagram_growth || 0) > 50) return 'medium'
    return 'low'
  }
  
  private static estimateEngagement(trend: CrossPlatformTrend): number {
    // Base engagement rate
    let engagement = 3.5
    
    if (trend.trending_both) engagement *= 2
    if ((trend.instagram_growth || 0) > 50) engagement *= 1.5
    if (trend.predicted_virality > 80) engagement *= 1.3
    
    return Math.round(engagement * 10) / 10
  }
}