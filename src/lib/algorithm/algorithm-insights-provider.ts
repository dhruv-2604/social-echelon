import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AlgorithmInsight {
  content_type: 'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO'
  performance_trend: 'increasing' | 'decreasing' | 'stable'
  reach_multiplier: number // e.g., 0.65 means 35% decrease
  optimal_posting_times: string[]
  caption_length_range: { min: number; max: number }
  hashtag_recommendations: number
  engagement_factors: string[]
}

export interface CurrentAlgorithmState {
  last_updated: string
  overall_changes: string[]
  content_type_performance: AlgorithmInsight[]
  recommendations: string[]
}

export class AlgorithmInsightsProvider {
  /**
   * Get current algorithm state for content generation
   */
  static async getCurrentAlgorithmState(niche: string): Promise<CurrentAlgorithmState> {
    // Get latest algorithm changes
    const { data: recentChanges } = await supabaseAdmin
      .from('algorithm_changes')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('detected_at', { ascending: false })
      .limit(10)
    
    // Get aggregated insights
    const { data: insights } = await supabaseAdmin
      .from('algorithm_insights')
      .select('*')
      .eq('is_active', true)
      .contains('affected_niches', [niche])
    
    return this.buildAlgorithmState(recentChanges || [], insights || [])
  }
  
  /**
   * Build algorithm state from raw data
   */
  private static buildAlgorithmState(changes: any[], insights: any[]): CurrentAlgorithmState {
    const contentTypePerformance: AlgorithmInsight[] = []
    const overallChanges: string[] = []
    const recommendations: string[] = []
    
    // Default performance for each content type
    const contentTypes: Array<'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO'> = [
      'REELS', 'CAROUSEL_ALBUM', 'IMAGE', 'VIDEO'
    ]
    
    for (const contentType of contentTypes) {
      let reachMultiplier = 1.0
      let performanceTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      const factors: string[] = []
      
      // Check for specific changes affecting this content type
      const relevantChanges = changes.filter(c => 
        c.change_type === 'format_preference' && 
        c.affected_content_types?.includes(contentType)
      )
      
      if (relevantChanges.length > 0) {
        const latestChange = relevantChanges[0]
        if (latestChange.metric_change < -10) {
          performanceTrend = 'decreasing'
          reachMultiplier = 1 + (latestChange.metric_change / 100)
          factors.push('Algorithm deprioritizing this format')
        } else if (latestChange.metric_change > 10) {
          performanceTrend = 'increasing'
          reachMultiplier = 1 + (latestChange.metric_change / 100)
          factors.push('Algorithm favoring this format')
        }
      }
      
      // Get specific insights for this content type
      const typeInsight = insights.find(i => 
        i.insight_type === 'content_format' && 
        i.metadata?.content_type === contentType
      )
      
      contentTypePerformance.push({
        content_type: contentType,
        performance_trend: performanceTrend,
        reach_multiplier: reachMultiplier,
        optimal_posting_times: this.getOptimalTimes(insights),
        caption_length_range: this.getCaptionRange(insights, contentType),
        hashtag_recommendations: this.getHashtagCount(insights, contentType),
        engagement_factors: factors
      })
    }
    
    // Build overall changes summary
    changes.forEach(change => {
      if (change.confidence > 70) {
        const direction = change.metric_change > 0 ? 'increased' : 'decreased'
        overallChanges.push(
          `${change.change_type.replace('_', ' ')} has ${direction} by ${Math.abs(change.metric_change)}%`
        )
      }
    })
    
    // Build recommendations
    if (contentTypePerformance.find(c => c.content_type === 'CAROUSEL_ALBUM' && c.performance_trend === 'increasing')) {
      recommendations.push('Prioritize carousel posts for better reach')
    }
    if (contentTypePerformance.find(c => c.content_type === 'REELS' && c.performance_trend === 'decreasing')) {
      recommendations.push('Reduce Reels frequency, focus on quality over quantity')
    }
    
    // Add timing recommendations
    const timingInsight = insights.find(i => i.insight_type === 'posting_time')
    if (timingInsight) {
      recommendations.push(`Post during ${timingInsight.recommended_action}`)
    }
    
    return {
      last_updated: new Date().toISOString(),
      overall_changes: overallChanges,
      content_type_performance: contentTypePerformance,
      recommendations
    }
  }
  
  /**
   * Get optimal posting times from insights
   */
  private static getOptimalTimes(insights: any[]): string[] {
    const timingInsight = insights.find(i => i.insight_type === 'posting_time')
    if (timingInsight?.metadata?.optimal_hours) {
      return timingInsight.metadata.optimal_hours.map((h: number) => `${h}:00`)
    }
    return ['9:00', '17:00', '20:00'] // Default times
  }
  
  /**
   * Get caption length recommendations
   */
  private static getCaptionRange(insights: any[], contentType: string): { min: number; max: number } {
    const captionInsight = insights.find(i => 
      i.insight_type === 'caption_length' && 
      i.metadata?.content_type === contentType
    )
    
    if (captionInsight?.metadata?.optimal_range) {
      return captionInsight.metadata.optimal_range
    }
    
    // Defaults based on content type
    const defaults: Record<string, { min: number; max: number }> = {
      'REELS': { min: 50, max: 150 },
      'CAROUSEL_ALBUM': { min: 150, max: 300 },
      'IMAGE': { min: 100, max: 200 },
      'VIDEO': { min: 100, max: 250 }
    }
    
    return defaults[contentType] || { min: 100, max: 200 }
  }
  
  /**
   * Get hashtag count recommendations
   */
  private static getHashtagCount(insights: any[], contentType: string): number {
    const hashtagInsight = insights.find(i => 
      i.insight_type === 'hashtag_performance' && 
      i.metadata?.content_type === contentType
    )
    
    return hashtagInsight?.metadata?.optimal_count || 8
  }
  
  /**
   * Format insights for AI prompt
   */
  static formatForAI(state: CurrentAlgorithmState): string {
    let prompt = '\nCURRENT ALGORITHM INSIGHTS:\n'
    
    if (state.overall_changes.length > 0) {
      prompt += `Recent Changes: ${state.overall_changes.join('; ')}\n`
    }
    
    prompt += '\nContent Type Performance:\n'
    state.content_type_performance.forEach(perf => {
      if (perf.performance_trend !== 'stable') {
        prompt += `- ${perf.content_type}: ${perf.performance_trend} (${Math.round((perf.reach_multiplier - 1) * 100)}% change)\n`
      }
    })
    
    if (state.recommendations.length > 0) {
      prompt += `\nAlgorithm Recommendations:\n${state.recommendations.map(r => `- ${r}`).join('\n')}\n`
    }
    
    return prompt
  }
}