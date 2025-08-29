import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { TrendData, TrendAnalysis } from './types'

// Use system user ID for global trends
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

export class TrendManager {
  /**
   * Save trends to database with deduplication and error handling
   */
  static async saveTrends(trends: TrendData[], userId?: string): Promise<void> {
    console.log(`Saving ${trends.length} trends to database`)
    const effectiveUserId = userId || SYSTEM_USER_ID

    for (const trend of trends) {
      try {
        // Check if trend already exists for today
        const supabaseAdmin = getSupabaseAdmin()
        const today = new Date().toISOString().split('T')[0]
        
        const { data: existing } = await supabaseAdmin
          .from('trend_analysis')
          .select('id, confidence_score')
          .eq('user_id', effectiveUserId)
          .eq('platform', 'instagram')
          .eq('trend_type', trend.trend_type)
          .eq('trend_name', trend.trend_name)
          .eq('niche', trend.niche)
          .gte('collected_at', today)
          .single() as { data: { id: string; confidence_score: number } | null; error: any }

        if (existing) {
          // Update existing trend
          await this.updateTrend(existing.id, trend)
        } else {
          // Insert new trend
          await this.insertTrend(trend, effectiveUserId)
        }

        // Record history snapshot
        await this.recordTrendHistory(existing?.id || trend.id!, trend)
      } catch (error) {
        console.error('Error saving trend:', error)
        // Continue with next trend instead of failing all
      }
    }
  }

  /**
   * Insert new trend with retry logic
   */
  private static async insertTrend(trend: TrendData, userId: string, retries = 3): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin()
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { error } = await supabaseAdmin
          .from('trend_analysis')
          .insert({
            user_id: userId,
            platform: 'instagram',
            trend_type: trend.trend_type,
            trend_name: trend.trend_name,
            niche: trend.niche,
            metrics: {
              engagement_rate: trend.engagement_rate,
              current_volume: trend.current_volume,
              growth_velocity: trend.growth_velocity,
              saturation_level: trend.saturation_level,
              related_hashtags: trend.related_hashtags,
              optimal_posting_times: trend.optimal_posting_times
            },
            top_posts: trend.example_posts,
            growth_velocity: trend.growth_velocity,
            current_volume: trend.current_volume,
            engagement_rate: trend.engagement_rate,
            saturation_level: trend.saturation_level,
            confidence_score: trend.confidence_score,
            trend_phase: trend.trend_phase
          })

        if (error) {
          if (attempt === retries) {
            throw error
          }
          console.warn(`Attempt ${attempt} failed, retrying...`, error)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        } else {
          break // Success
        }
      } catch (error) {
        if (attempt === retries) {
          console.error('Error inserting trend after retries:', error)
        }
      }
    }
  }

  /**
   * Update existing trend with optimistic locking
   */
  private static async updateTrend(id: string, trend: TrendData): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('trend_analysis')
      .update({
        metrics: {
          engagement_rate: trend.engagement_rate,
          current_volume: trend.current_volume,
          growth_velocity: trend.growth_velocity,
          saturation_level: trend.saturation_level,
          related_hashtags: trend.related_hashtags,
          optimal_posting_times: trend.optimal_posting_times
        },
        growth_velocity: trend.growth_velocity,
        current_volume: trend.current_volume,
        engagement_rate: trend.engagement_rate,
        saturation_level: trend.saturation_level,
        confidence_score: trend.confidence_score,
        trend_phase: trend.trend_phase,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating trend:', error)
    }
  }

  /**
   * Record trend history for tracking changes
   */
  private static async recordTrendHistory(trendId: string, trend: TrendData): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('trend_history')
      .insert({
        trend_analysis_id: trendId,
        growth_velocity: trend.growth_velocity,
        current_volume: trend.current_volume,
        engagement_rate: trend.engagement_rate,
        saturation_level: trend.saturation_level,
        confidence_score: trend.confidence_score
      })

    if (error) {
      console.error('Error recording trend history:', error)
    }
  }

  /**
   * Get current trends for a niche with caching
   */
  static async getTrendsForNiche(
    niche: string, 
    minConfidence: number = 60,
    userId?: string
  ): Promise<TrendData[]> {
    const supabaseAdmin = getSupabaseAdmin()
    const effectiveUserId = userId || SYSTEM_USER_ID
    
    // Get trends from last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: trends, error } = await supabaseAdmin
      .from('trend_analysis')
      .select('*')
      .or(`user_id.eq.${effectiveUserId},user_id.eq.${SYSTEM_USER_ID}`)
      .eq('niche', niche)
      .gte('confidence_score', minConfidence)
      .gte('collected_at', sevenDaysAgo.toISOString())
      .order('confidence_score', { ascending: false })
      .limit(20) as { data: any[] | null; error: any }

    if (error) {
      console.error('Error fetching trends:', error)
      return []
    }

    // Transform to TrendData format
    return (trends || []).map(t => ({
      id: t.id,
      niche: t.niche,
      trend_type: t.trend_type,
      trend_name: t.trend_name,
      growth_velocity: t.growth_velocity,
      current_volume: t.current_volume,
      engagement_rate: t.engagement_rate,
      saturation_level: t.saturation_level,
      confidence_score: t.confidence_score,
      trend_phase: t.trend_phase,
      related_hashtags: t.metrics?.related_hashtags || [],
      example_posts: t.top_posts || [],
      optimal_posting_times: t.metrics?.optimal_posting_times || []
    }))
  }

  /**
   * Get trending hashtags for content generation
   */
  static async getTrendingHashtags(
    niche: string, 
    limit: number = 10,
    userId?: string
  ): Promise<string[]> {
    const supabaseAdmin = getSupabaseAdmin()
    const effectiveUserId = userId || SYSTEM_USER_ID
    
    const { data: trends, error } = await supabaseAdmin
      .from('trend_analysis')
      .select('trend_name, confidence_score')
      .or(`user_id.eq.${effectiveUserId},user_id.eq.${SYSTEM_USER_ID}`)
      .eq('niche', niche)
      .eq('trend_type', 'hashtag')
      .in('trend_phase', ['emerging', 'growing'])
      .gte('confidence_score', 70)
      .order('confidence_score', { ascending: false })
      .limit(limit) as { data: Array<{trend_name: string; confidence_score: number}> | null; error: any }

    if (error || !trends) {
      console.error('Error fetching hashtags:', error)
      return []
    }

    return trends.map(t => t.trend_name)
  }

  /**
   * Analyze trends for a niche and return insights
   */
  static async analyzeTrendsForNiche(niche: string, userId?: string): Promise<TrendAnalysis> {
    const trends = await this.getTrendsForNiche(niche, 60, userId)
    
    // Extract hot topics
    const hot_topics = trends
      .filter(t => t.trend_type === 'topic' && t.confidence_score > 75)
      .map(t => t.trend_name)
      .slice(0, 5)

    // Get optimal posting times (merge all times and find most common)
    const allTimes: number[] = []
    trends.forEach(t => allTimes.push(...(t.optimal_posting_times || [])))
    const timeCounts = allTimes.reduce((acc, time) => {
      acc[time] = (acc[time] || 0) + 1
      return acc
    }, {} as { [key: number]: number })
    const best_posting_times = Object.entries(timeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time]) => parseInt(time))

    // Calculate content format mix
    const formatTrends = trends.filter(t => t.trend_type === 'format')
    const content_format_mix = formatTrends.reduce((acc, t) => {
      acc[t.trend_name] = t.engagement_rate
      return acc
    }, {} as { [key: string]: number })

    // Calculate average engagement rate
    const avg_engagement_rate = 
      trends.reduce((sum, t) => sum + t.engagement_rate, 0) / trends.length || 0

    return {
      trends,
      niche_summary: {
        hot_topics,
        best_posting_times,
        content_format_mix,
        avg_engagement_rate
      }
    }
  }

  /**
   * Clean up old trends that are no longer relevant
   */
  static async cleanupOldTrends(): Promise<void> {
    try {
      // Delete trends that have been declining for more than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const supabaseAdmin = getSupabaseAdmin()
      const { error } = await supabaseAdmin
        .from('trend_analysis')
        .delete()
        .eq('trend_phase', 'declining')
        .lt('updated_at', thirtyDaysAgo.toISOString())

      if (error) {
        console.error('Error cleaning up old trends:', error)
      } else {
        console.log('Successfully cleaned up old declining trends')
      }
      
      // Also delete very old trend history (>90 days)
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      
      const { error: historyError } = await supabaseAdmin
        .from('trend_history')
        .delete()
        .lt('recorded_at', ninetyDaysAgo.toISOString())
        
      if (historyError) {
        console.error('Error cleaning up old trend history:', historyError)
      }
    } catch (error) {
      console.error('Error in cleanupOldTrends:', error)
    }
  }

  /**
   * Calculate trend velocity (rate of change)
   */
  static async calculateTrendVelocity(trendId: string): Promise<number> {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Get last 7 days of history
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: history, error } = await supabaseAdmin
      .from('trend_history')
      .select('engagement_rate, recorded_at')
      .eq('trend_analysis_id', trendId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .order('recorded_at', { ascending: true })
    
    if (error || !history || history.length < 2) {
      return 0
    }
    
    // Calculate rate of change
    const firstRate = history[0].engagement_rate as number
    const lastRate = history[history.length - 1].engagement_rate as number
    const daysDiff = Math.max(1, history.length)
    
    return ((lastRate - firstRate) / firstRate) * 100 / daysDiff
  }
}