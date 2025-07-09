import { createClient } from '@supabase/supabase-js'
import { TrendData, TrendAnalysis } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class TrendManager {
  /**
   * Save trends to database with deduplication
   */
  static async saveTrends(trends: TrendData[]): Promise<void> {
    console.log(`Saving ${trends.length} trends to database`)

    for (const trend of trends) {
      try {
        // Check if trend already exists
        const { data: existing } = await supabaseAdmin
          .from('trends')
          .select('id, confidence_score')
          .eq('niche', trend.niche)
          .eq('trend_type', trend.trend_type)
          .eq('trend_name', trend.trend_name)
          .single()

        if (existing) {
          // Update existing trend
          await this.updateTrend(existing.id, trend)
        } else {
          // Insert new trend
          await this.insertTrend(trend)
        }

        // Record history snapshot
        await this.recordTrendHistory(existing?.id || trend.id!, trend)
      } catch (error) {
        console.error('Error saving trend:', error)
      }
    }
  }

  /**
   * Insert new trend
   */
  private static async insertTrend(trend: TrendData): Promise<void> {
    const { error } = await supabaseAdmin
      .from('trends')
      .insert({
        niche: trend.niche,
        trend_type: trend.trend_type,
        trend_name: trend.trend_name,
        growth_velocity: trend.growth_velocity,
        current_volume: trend.current_volume,
        engagement_rate: trend.engagement_rate,
        saturation_level: trend.saturation_level,
        confidence_score: trend.confidence_score,
        trend_phase: trend.trend_phase,
        related_hashtags: trend.related_hashtags,
        example_posts: trend.example_posts || [],
        optimal_posting_times: trend.optimal_posting_times
      })

    if (error) {
      console.error('Error inserting trend:', error)
    }
  }

  /**
   * Update existing trend
   */
  private static async updateTrend(id: string, trend: TrendData): Promise<void> {
    const { error } = await supabaseAdmin
      .from('trends')
      .update({
        growth_velocity: trend.growth_velocity,
        current_volume: trend.current_volume,
        engagement_rate: trend.engagement_rate,
        saturation_level: trend.saturation_level,
        confidence_score: trend.confidence_score,
        trend_phase: trend.trend_phase,
        related_hashtags: trend.related_hashtags,
        optimal_posting_times: trend.optimal_posting_times,
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
    const { error } = await supabaseAdmin
      .from('trend_history')
      .insert({
        trend_id: trendId,
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
   * Get current trends for a niche
   */
  static async getTrendsForNiche(
    niche: string, 
    minConfidence: number = 60
  ): Promise<TrendData[]> {
    const { data: trends, error } = await supabaseAdmin
      .from('trends')
      .select('*')
      .eq('niche', niche)
      .gte('confidence_score', minConfidence)
      .order('confidence_score', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching trends:', error)
      return []
    }

    return trends || []
  }

  /**
   * Get trending hashtags for content generation
   */
  static async getTrendingHashtags(
    niche: string, 
    limit: number = 10
  ): Promise<string[]> {
    const { data: trends, error } = await supabaseAdmin
      .from('trends')
      .select('trend_name, confidence_score')
      .eq('niche', niche)
      .eq('trend_type', 'hashtag')
      .in('trend_phase', ['emerging', 'growing'])
      .gte('confidence_score', 70)
      .order('confidence_score', { ascending: false })
      .limit(limit)

    if (error || !trends) {
      console.error('Error fetching hashtags:', error)
      return []
    }

    return trends.map(t => t.trend_name)
  }

  /**
   * Analyze trends for a niche and return insights
   */
  static async analyzeTrendsForNiche(niche: string): Promise<TrendAnalysis> {
    const trends = await this.getTrendsForNiche(niche)
    
    // Extract hot topics
    const hot_topics = trends
      .filter(t => t.trend_type === 'topic' && t.confidence_score > 75)
      .map(t => t.trend_name)
      .slice(0, 5)

    // Get optimal posting times (merge all times and find most common)
    const allTimes: number[] = []
    trends.forEach(t => allTimes.push(...t.optimal_posting_times))
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
    // Delete trends that have been declining for more than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { error } = await supabaseAdmin
      .from('trends')
      .delete()
      .eq('trend_phase', 'declining')
      .lt('updated_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error cleaning up old trends:', error)
    }
  }
}