import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface ContentPattern {
  pattern_type: string
  pattern_description: string
  pattern_value: any
  avg_performance_score: number
  success_rate: number
  sample_size: number
  confidence_score: number
  applicable_niches: string[]
}

export class PatternDetector {
  private readonly MIN_SAMPLE_SIZE = 20
  private readonly SUCCESS_THRESHOLD = 70 // Performance score > 70 is "success"

  /**
   * Detect all patterns from content signals
   */
  async detectPatterns(): Promise<ContentPattern[]> {
    console.log('Starting pattern detection...')
    
    const patterns: ContentPattern[] = []
    
    // Detect different types of patterns
    const [
      captionPatterns,
      hashtagPatterns,
      timingPatterns,
      formatPatterns,
      emojiPatterns
    ] = await Promise.all([
      this.detectCaptionLengthPatterns(),
      this.detectHashtagPatterns(),
      this.detectTimingPatterns(),
      this.detectFormatPatterns(),
      this.detectEmojiPatterns()
    ])
    
    patterns.push(
      ...captionPatterns,
      ...hashtagPatterns,
      ...timingPatterns,
      ...formatPatterns,
      ...emojiPatterns
    )
    
    // Store significant patterns
    for (const pattern of patterns) {
      if (pattern.confidence_score >= 70) {
        await this.storePattern(pattern)
      }
    }
    
    return patterns
  }

  /**
   * Detect optimal caption length patterns
   */
  private async detectCaptionLengthPatterns(): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = []
    
    // Define caption length ranges to test
    const ranges = [
      { min: 0, max: 50, label: 'very_short' },
      { min: 50, max: 100, label: 'short' },
      { min: 100, max: 200, label: 'medium' },
      { min: 200, max: 500, label: 'long' },
      { min: 500, max: 2200, label: 'very_long' }
    ]
    
    // Get performance by caption length
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('caption_length, performance_score, user_niche')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!signals || signals.length < this.MIN_SAMPLE_SIZE) return patterns
    
    // Analyze each range
    for (const range of ranges) {
      const rangeSignals = signals.filter(
        s => s.caption_length >= range.min && s.caption_length < range.max
      )
      
      if (rangeSignals.length < this.MIN_SAMPLE_SIZE) continue
      
      const avgScore = rangeSignals.reduce((sum, s) => sum + s.performance_score, 0) / rangeSignals.length
      const successCount = rangeSignals.filter(s => s.performance_score >= this.SUCCESS_THRESHOLD).length
      const successRate = (successCount / rangeSignals.length) * 100
      
      // Get niches where this works
      const nichePerformance = this.groupByNiche(rangeSignals)
      const topNiches = Object.entries(nichePerformance)
        .filter(([_, data]) => data.avgScore > 60)
        .map(([niche]) => niche)
      
      if (avgScore > 60) {
        patterns.push({
          pattern_type: 'caption_length',
          pattern_description: `Captions ${range.label} (${range.min}-${range.max} chars) perform well`,
          pattern_value: { min: range.min, max: range.max },
          avg_performance_score: Number(avgScore.toFixed(1)),
          success_rate: Number(successRate.toFixed(1)),
          sample_size: rangeSignals.length,
          confidence_score: this.calculateConfidence(rangeSignals.length, avgScore),
          applicable_niches: topNiches
        })
      }
    }
    
    return patterns
  }

  /**
   * Detect optimal hashtag count patterns
   */
  private async detectHashtagPatterns(): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = []
    
    const supabaseAdmin = getSupabaseAdmin()
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('hashtag_count, performance_score, user_niche')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!signals) return patterns
    
    // Group by hashtag count
    const byCount: Record<number, typeof signals> = {}
    signals.forEach(s => {
      if (!byCount[s.hashtag_count]) byCount[s.hashtag_count] = []
      byCount[s.hashtag_count].push(s)
    })
    
    // Find best performing counts
    let bestCount = 0
    let bestAvgScore = 0
    
    Object.entries(byCount).forEach(([count, sigs]) => {
      if (sigs.length < this.MIN_SAMPLE_SIZE) return
      
      const avgScore = sigs.reduce((sum, s) => sum + s.performance_score, 0) / sigs.length
      if (avgScore > bestAvgScore) {
        bestAvgScore = avgScore
        bestCount = parseInt(count)
      }
    })
    
    // Create pattern for optimal range
    if (bestAvgScore > 60) {
      const optimalMin = Math.max(0, bestCount - 2)
      const optimalMax = bestCount + 2
      
      patterns.push({
        pattern_type: 'hashtag_count',
        pattern_description: `Using ${optimalMin}-${optimalMax} hashtags is optimal`,
        pattern_value: { optimal: bestCount, range: [optimalMin, optimalMax] },
        avg_performance_score: Number(bestAvgScore.toFixed(1)),
        success_rate: 80, // Simplified
        sample_size: byCount[bestCount].length,
        confidence_score: this.calculateConfidence(byCount[bestCount].length, bestAvgScore),
        applicable_niches: []
      })
    }
    
    return patterns
  }

  /**
   * Detect optimal posting time patterns
   */
  private async detectTimingPatterns(): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = []
    
    const supabaseAdmin = getSupabaseAdmin()
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('hour_of_day, day_of_week, performance_score, user_niche')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!signals) return patterns
    
    // Find best hours
    const byHour: Record<number, typeof signals> = {}
    signals.forEach(s => {
      if (!byHour[s.hour_of_day]) byHour[s.hour_of_day] = []
      byHour[s.hour_of_day].push(s)
    })
    
    const topHours: { hour: number; score: number }[] = []
    Object.entries(byHour).forEach(([hour, sigs]) => {
      if (sigs.length >= 10) {
        const avgScore = sigs.reduce((sum, s) => sum + s.performance_score, 0) / sigs.length
        topHours.push({ hour: parseInt(hour), score: avgScore })
      }
    })
    
    // Sort and get top 3 hours
    topHours.sort((a, b) => b.score - a.score)
    const bestHours = topHours.slice(0, 3)
    
    if (bestHours.length > 0 && bestHours[0].score > 60) {
      patterns.push({
        pattern_type: 'posting_time',
        pattern_description: `Best posting times: ${bestHours.map(h => `${h.hour}:00`).join(', ')}`,
        pattern_value: { best_hours: bestHours.map(h => h.hour) },
        avg_performance_score: Number(bestHours[0].score.toFixed(1)),
        success_rate: 75,
        sample_size: signals.length,
        confidence_score: 80,
        applicable_niches: []
      })
    }
    
    return patterns
  }

  /**
   * Detect content format patterns
   */
  private async detectFormatPatterns(): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = []
    
    const supabaseAdmin = getSupabaseAdmin()
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('has_carousel, has_reel, performance_score, user_niche')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!signals) return patterns
    
    // Calculate performance by format
    const formats = {
      reel: signals.filter(s => s.has_reel),
      carousel: signals.filter(s => s.has_carousel),
      single: signals.filter(s => !s.has_reel && !s.has_carousel)
    }
    
    Object.entries(formats).forEach(([format, sigs]) => {
      if (sigs.length < this.MIN_SAMPLE_SIZE) return
      
      const avgScore = sigs.reduce((sum, s) => sum + s.performance_score, 0) / sigs.length
      const successRate = (sigs.filter(s => s.performance_score >= this.SUCCESS_THRESHOLD).length / sigs.length) * 100
      
      if (avgScore > 60) {
        patterns.push({
          pattern_type: 'content_format',
          pattern_description: `${format.charAt(0).toUpperCase() + format.slice(1)}s perform well`,
          pattern_value: { format },
          avg_performance_score: Number(avgScore.toFixed(1)),
          success_rate: Number(successRate.toFixed(1)),
          sample_size: sigs.length,
          confidence_score: this.calculateConfidence(sigs.length, avgScore),
          applicable_niches: []
        })
      }
    })
    
    return patterns
  }

  /**
   * Detect emoji usage patterns
   */
  private async detectEmojiPatterns(): Promise<ContentPattern[]> {
    const patterns: ContentPattern[] = []
    
    const supabaseAdmin = getSupabaseAdmin()
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('emoji_count, performance_score, user_niche')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (!signals) return patterns
    
    // Group by emoji count ranges
    const ranges = [
      { min: 0, max: 1, label: 'no_emojis' },
      { min: 1, max: 3, label: 'few_emojis' },
      { min: 3, max: 6, label: 'moderate_emojis' },
      { min: 6, max: 20, label: 'many_emojis' }
    ]
    
    for (const range of ranges) {
      const rangeSignals = signals.filter(
        s => s.emoji_count >= range.min && s.emoji_count < range.max
      )
      
      if (rangeSignals.length < this.MIN_SAMPLE_SIZE) continue
      
      const avgScore = rangeSignals.reduce((sum, s) => sum + s.performance_score, 0) / rangeSignals.length
      
      if (avgScore > 60) {
        patterns.push({
          pattern_type: 'emoji_usage',
          pattern_description: `Posts with ${range.label.replace(/_/g, ' ')} perform well`,
          pattern_value: { min: range.min, max: range.max },
          avg_performance_score: Number(avgScore.toFixed(1)),
          success_rate: 70,
          sample_size: rangeSignals.length,
          confidence_score: this.calculateConfidence(rangeSignals.length, avgScore),
          applicable_niches: []
        })
      }
    }
    
    return patterns
  }

  /**
   * Group signals by niche and calculate average performance
   */
  private groupByNiche(signals: any[]): Record<string, { avgScore: number; count: number }> {
    const byNiche: Record<string, { totalScore: number; count: number }> = {}
    
    signals.forEach(s => {
      if (!byNiche[s.user_niche]) {
        byNiche[s.user_niche] = { totalScore: 0, count: 0 }
      }
      byNiche[s.user_niche].totalScore += s.performance_score
      byNiche[s.user_niche].count += 1
    })
    
    const result: Record<string, { avgScore: number; count: number }> = {}
    Object.entries(byNiche).forEach(([niche, data]) => {
      result[niche] = {
        avgScore: data.totalScore / data.count,
        count: data.count
      }
    })
    
    return result
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidence(sampleSize: number, avgScore: number): number {
    const sampleScore = Math.min(50, (sampleSize / 100) * 50) // Max 50 points for sample size
    const performanceScore = Math.min(50, (avgScore / 100) * 50) // Max 50 points for performance
    return Math.round(sampleScore + performanceScore)
  }

  /**
   * Store pattern in database
   */
  private async storePattern(pattern: ContentPattern): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from('content_patterns')
      .insert({
        pattern_type: pattern.pattern_type,
        pattern_description: pattern.pattern_description,
        pattern_value: pattern.pattern_value,
        avg_performance_score: pattern.avg_performance_score,
        success_rate: pattern.success_rate,
        sample_size: pattern.sample_size,
        confidence_score: pattern.confidence_score,
        applicable_niches: pattern.applicable_niches
      })
    
    if (error) {
      console.error('Error storing pattern:', error)
    }
  }
}