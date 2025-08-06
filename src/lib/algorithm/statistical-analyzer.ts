import { getSupabaseAdmin } from '@/lib/supabase-admin'

export interface StatisticalResult {
  isSignificant: boolean
  pValue: number
  confidenceLevel: number
  effectSize: number
  sampleSize: number
  recommendation: string
}

export class StatisticalAnalyzer {
  /**
   * Perform t-test to determine if change is statistically significant
   */
  static performTTest(
    beforeData: number[],
    afterData: number[]
  ): { tStatistic: number; pValue: number } {
    // Calculate means
    const beforeMean = beforeData.reduce((sum, val) => sum + val, 0) / beforeData.length
    const afterMean = afterData.reduce((sum, val) => sum + val, 0) / afterData.length
    
    // Calculate standard deviations
    const beforeSD = Math.sqrt(
      beforeData.reduce((sum, val) => sum + Math.pow(val - beforeMean, 2), 0) / (beforeData.length - 1)
    )
    const afterSD = Math.sqrt(
      afterData.reduce((sum, val) => sum + Math.pow(val - afterMean, 2), 0) / (afterData.length - 1)
    )
    
    // Calculate pooled standard error
    const pooledSE = Math.sqrt(
      (Math.pow(beforeSD, 2) / beforeData.length) + 
      (Math.pow(afterSD, 2) / afterData.length)
    )
    
    // Calculate t-statistic
    const tStatistic = (afterMean - beforeMean) / pooledSE
    
    // Calculate degrees of freedom (Welch's approximation)
    const df = Math.pow(pooledSE, 4) / (
      Math.pow(Math.pow(beforeSD, 2) / beforeData.length, 2) / (beforeData.length - 1) +
      Math.pow(Math.pow(afterSD, 2) / afterData.length, 2) / (afterData.length - 1)
    )
    
    // Approximate p-value using normal distribution for large samples
    // In production, would use a proper t-distribution library
    const pValue = this.approximatePValue(Math.abs(tStatistic), df)
    
    return { tStatistic, pValue }
  }

  /**
   * Calculate effect size (Cohen's d)
   */
  static calculateEffectSize(
    beforeData: number[],
    afterData: number[]
  ): number {
    const beforeMean = beforeData.reduce((sum, val) => sum + val, 0) / beforeData.length
    const afterMean = afterData.reduce((sum, val) => sum + val, 0) / afterData.length
    
    // Calculate pooled standard deviation
    const beforeSD = Math.sqrt(
      beforeData.reduce((sum, val) => sum + Math.pow(val - beforeMean, 2), 0) / (beforeData.length - 1)
    )
    const afterSD = Math.sqrt(
      afterData.reduce((sum, val) => sum + Math.pow(val - afterMean, 2), 0) / (afterData.length - 1)
    )
    
    const pooledSD = Math.sqrt(
      ((beforeData.length - 1) * Math.pow(beforeSD, 2) + 
       (afterData.length - 1) * Math.pow(afterSD, 2)) / 
      (beforeData.length + afterData.length - 2)
    )
    
    return (afterMean - beforeMean) / pooledSD
  }

  /**
   * Analyze if a change is statistically significant
   */
  static async analyzeChange(
    metricName: string,
    beforeData: number[],
    afterData: number[]
  ): Promise<StatisticalResult> {
    // Need minimum sample size
    if (beforeData.length < 10 || afterData.length < 10) {
      return {
        isSignificant: false,
        pValue: 1,
        confidenceLevel: 0,
        effectSize: 0,
        sampleSize: beforeData.length + afterData.length,
        recommendation: 'Insufficient data for analysis (need at least 10 samples per period)'
      }
    }

    // Perform statistical tests
    const { tStatistic, pValue } = this.performTTest(beforeData, afterData)
    const effectSize = this.calculateEffectSize(beforeData, afterData)
    
    // Determine significance (p < 0.05)
    const isSignificant = pValue < 0.05
    const confidenceLevel = (1 - pValue) * 100

    // Calculate means for context
    const beforeMean = beforeData.reduce((sum, val) => sum + val, 0) / beforeData.length
    const afterMean = afterData.reduce((sum, val) => sum + val, 0) / afterData.length
    const percentChange = ((afterMean - beforeMean) / beforeMean) * 100

    // Generate recommendation based on results
    let recommendation = ''
    if (!isSignificant) {
      recommendation = 'Change is not statistically significant - likely normal variation'
    } else if (Math.abs(effectSize) < 0.2) {
      recommendation = 'Change is statistically significant but effect is small'
    } else if (Math.abs(effectSize) < 0.5) {
      recommendation = 'Moderate effect detected - monitor closely'
    } else {
      recommendation = percentChange > 0 
        ? 'Large positive effect detected - capitalize on this change'
        : 'Large negative effect detected - immediate action recommended'
    }

    return {
      isSignificant,
      pValue,
      confidenceLevel,
      effectSize,
      sampleSize: beforeData.length + afterData.length,
      recommendation
    }
  }

  /**
   * Filter out seasonal/weekly patterns
   */
  static async filterSeasonalEffects(
    data: any[],
    dateField: string = 'collected_at'
  ): Promise<any[]> {
    // Group by day of week to detect weekly patterns
    const byDayOfWeek: Record<number, any[]> = {}
    
    data.forEach(item => {
      const date = new Date(item[dateField])
      const dayOfWeek = date.getDay()
      if (!byDayOfWeek[dayOfWeek]) byDayOfWeek[dayOfWeek] = []
      byDayOfWeek[dayOfWeek].push(item)
    })

    // Calculate day-of-week factors
    const overallMean = data.reduce((sum, item) => sum + item.avg_reach, 0) / data.length
    const dayFactors: Record<number, number> = {}
    
    Object.entries(byDayOfWeek).forEach(([day, items]) => {
      const dayMean = items.reduce((sum, item) => sum + item.avg_reach, 0) / items.length
      dayFactors[parseInt(day)] = dayMean / overallMean
    })

    // Adjust data for seasonal effects
    return data.map(item => {
      const date = new Date(item[dateField])
      const dayOfWeek = date.getDay()
      const factor = dayFactors[dayOfWeek] || 1
      
      return {
        ...item,
        avg_reach_adjusted: item.avg_reach / factor,
        seasonal_factor: factor
      }
    })
  }

  /**
   * Detect if change is gradual vs sudden
   */
  static analyzeChangePattern(
    timeSeriesData: { date: Date; value: number }[]
  ): 'sudden' | 'gradual' | 'no_change' {
    if (timeSeriesData.length < 7) return 'no_change'

    // Sort by date
    const sorted = timeSeriesData.sort((a, b) => a.date.getTime() - b.date.getTime())
    
    // Calculate day-to-day changes
    const changes: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const change = (sorted[i].value - sorted[i-1].value) / sorted[i-1].value
      changes.push(change)
    }

    // Calculate standard deviation of changes
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
    const stdDev = Math.sqrt(
      changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length
    )

    // Look for outlier changes (> 2 standard deviations)
    const outliers = changes.filter(c => Math.abs(c - avgChange) > 2 * stdDev)

    if (outliers.length >= 2) {
      return 'sudden'
    } else if (Math.abs(avgChange) > 0.02) { // 2% daily change
      return 'gradual'
    } else {
      return 'no_change'
    }
  }

  /**
   * Approximate p-value (simplified for demo)
   */
  private static approximatePValue(tStatistic: number, df: number): number {
    // This is a rough approximation using normal distribution
    // In production, use a proper statistics library
    const z = Math.abs(tStatistic)
    
    // Approximate using standard normal for large df
    if (df > 30) {
      // Using approximation: P(Z > z) ≈ exp(-0.717 * z - 0.416 * z^2) for z > 0
      if (z > 2.5) return 0.01
      if (z > 2) return 0.05
      if (z > 1.5) return 0.1
      if (z > 1) return 0.3
      return 0.5
    }
    
    // For smaller df, be more conservative
    if (z > 3) return 0.01
    if (z > 2.5) return 0.05
    if (z > 2) return 0.1
    return 0.5
  }

  /**
   * Validate that a change is real (not a false positive)
   */
  static async validateChange(
    changeId: string,
    waitHours: number = 48
  ): Promise<boolean> {
    // Get the original change
    const { data: change } = await supabaseAdmin
      .from('algorithm_changes')
      .select('*')
      .eq('id', changeId)
      .single()

    if (!change) return false

    // Check if enough time has passed
    const detectedAt = new Date(change.detected_at)
    const now = new Date()
    const hoursPassed = (now.getTime() - detectedAt.getTime()) / (1000 * 60 * 60)

    if (hoursPassed < waitHours) {
      console.log(`Only ${hoursPassed} hours passed, need ${waitHours} hours for validation`)
      return false
    }

    // Re-analyze with new data
    const newData = await this.getMetricData(
      change.metric_name,
      change.niches_affected,
      detectedAt,
      now
    )

    // Check if change persists
    const stillSignificant = await this.checkIfChangesPersist(
      change.metric_name,
      change.before_value,
      newData
    )

    if (stillSignificant) {
      // Update status to confirmed
      await supabaseAdmin
        .from('algorithm_changes')
        .update({
          status: 'confirmed',
          confirmed_at: now.toISOString()
        })
        .eq('id', changeId)

      return true
    } else {
      // Mark as false positive
      await supabaseAdmin
        .from('algorithm_changes')
        .update({
          status: 'false_positive',
          updated_at: now.toISOString()
        })
        .eq('id', changeId)

      return false
    }
  }

  /**
   * Get metric data for a specific period
   */
  private static async getMetricData(
    metricName: string,
    niches: string[],
    startDate: Date,
    endDate: Date
  ): Promise<number[]> {
    const { data } = await supabaseAdmin
      .from('user_performance_summary')
      .select(`${metricName}, profiles!inner(niche)`)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .in('profiles.niche', niches)

    return data?.map(d => (d as any)[metricName]) || []
  }

  /**
   * Check if changes persist
   */
  private static async checkIfChangesPersist(
    metricName: string,
    originalValue: number,
    newData: number[]
  ): Promise<boolean> {
    if (newData.length === 0) return false

    const newMean = newData.reduce((sum, val) => sum + val, 0) / newData.length
    const percentDiff = Math.abs((newMean - originalValue) / originalValue)

    // Change must still be at least 15% different
    return percentDiff > 0.15
  }
}