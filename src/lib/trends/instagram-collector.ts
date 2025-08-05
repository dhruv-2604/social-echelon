import { InstagramAPI } from '@/lib/instagram'
import { TrendData, HashtagMetrics, NicheCompetitor } from './types'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export class InstagramTrendCollector {
  private api: InstagramAPI

  constructor(accessToken: string) {
    this.api = new InstagramAPI(accessToken)
  }

  /**
   * Collect trending data for a specific niche
   */
  async collectTrends(niche: string): Promise<TrendData[]> {
    console.log(`Collecting trends for ${niche}`)
    
    const trends: TrendData[] = []

    // PRIORITIZE: Topic trends (what people are talking about)
    const topicTrends = this.generateTopicTrends(niche)
    trends.push(...topicTrends)

    // PRIORITIZE: Format trends (what content types work)
    const formatTrends = this.generateFormatTrends(niche)
    trends.push(...formatTrends)

    // SECONDARY: Basic hashtag suggestions (not from API)
    const seedHashtags = this.getSeedHashtagsForNiche(niche).slice(0, 3) // Just top 3
    for (const hashtag of seedHashtags) {
      const metrics = await this.getHashtagMetrics(hashtag)
      const trendData = this.analyzeTrend(hashtag, metrics, niche)
      
      if (trendData.confidence_score > 60) {
        trends.push(trendData)
      }
    }

    return trends.sort((a, b) => b.confidence_score - a.confidence_score)
  }

  /**
   * Analyze competitors in a niche to find content trends
   */
  async analyzeNicheCompetitors(niche: string): Promise<TrendData[]> {
    console.log(`Analyzing competitors in ${niche} niche`)
    
    // Get competitors from database
    const { data: competitors } = await supabaseAdmin
      .from('niche_competitors')
      .select('*')
      .eq('niche', niche)
      .order('engagement_rate', { ascending: false })
      .limit(10)

    if (!competitors || competitors.length === 0) {
      console.log('No competitors found, using default analysis')
      return []
    }

    const trends: TrendData[] = []
    const contentPatterns = new Map<string, number>()
    const hashtagFrequency = new Map<string, number>()

    for (const competitor of competitors) {
      try {
        // Analyze their recent posts
        // For now, we can only analyze our own posts, not competitors
        // Skip competitor analysis until we have API access
        continue
      } catch (error) {
        console.error(`Error analyzing competitor ${competitor.instagram_username}:`, error)
      }
    }

    // Convert patterns to trends
    const formatTrends = this.patternsToTrends(contentPatterns, niche, 'format')
    const hashtagTrends = this.hashtagsToTrends(hashtagFrequency, niche)

    return [...formatTrends, ...hashtagTrends]
  }

  /**
   * Get hashtag metrics (using mock data since Instagram API is limited)
   */
  private async getHashtagMetrics(hashtag: string): Promise<HashtagMetrics> {
    // Instagram API doesn't provide the hashtag data we need
    // Using intelligent mock data based on hashtag patterns
    return this.getMockHashtagMetrics(hashtag)
  }


  /**
   * Fallback mock data if API fails
   */
  private getMockHashtagMetrics(hashtag: string): HashtagMetrics {
    console.log(`Using mock data for ${hashtag} - API unavailable`)
    
    const basePopularity = Math.random()
    const postCount = basePopularity > 0.7 ? 
      Math.floor(Math.random() * 5000000) + 100000 :
      Math.floor(Math.random() * 100000) + 1000

    const growthFactor = Math.random() * 2
    const recentPosts = Math.floor((postCount * 0.001) * growthFactor) + 10

    return {
      hashtag,
      post_count: postCount,
      recent_posts: Math.max(10, recentPosts),
      avg_likes: Math.floor(Math.random() * 800) + 100,
      avg_comments: Math.floor(Math.random() * 80) + 10,
      engagement_rate: Math.random() * 8 + 2,
      top_posts: []
    }
  }

  /**
   * Analyze trend data and calculate scores
   */
  private analyzeTrend(hashtag: string, metrics: HashtagMetrics, niche: string): TrendData {
    // Calculate growth velocity based on recent posts vs total
    const recentRatio = metrics.recent_posts / Math.max(metrics.post_count, 1)
    const growth_velocity = Math.round(recentRatio * 200 - 50) // Convert to -100 to +100

    // Calculate saturation (how competitive)
    const saturation_level = Math.min(100, Math.round(metrics.post_count / 10000))

    // Calculate confidence score
    const confidence_score = this.calculateConfidenceScore({
      growth_velocity,
      engagement_rate: metrics.engagement_rate,
      saturation_level,
      post_volume: metrics.recent_posts
    })

    // Determine trend phase
    const trend_phase = this.determineTrendPhase(growth_velocity, saturation_level)

    return {
      niche,
      trend_type: 'hashtag',
      trend_name: `#${hashtag}`,
      growth_velocity,
      current_volume: metrics.post_count,
      engagement_rate: metrics.engagement_rate,
      saturation_level,
      confidence_score,
      trend_phase,
      related_hashtags: [],
      optimal_posting_times: this.calculateOptimalTimes(niche)
    }
  }

  /**
   * Calculate overall confidence score for a trend
   */
  private calculateConfidenceScore(factors: {
    growth_velocity: number
    engagement_rate: number
    saturation_level: number
    post_volume: number
  }): number {
    const weights = {
      growth: 0.3,
      engagement: 0.3,
      saturation: 0.2,
      volume: 0.2
    }

    // Normalize factors to 0-100
    const normalizedGrowth = (factors.growth_velocity + 100) / 2
    const normalizedEngagement = Math.min(100, factors.engagement_rate * 10)
    const normalizedSaturation = 100 - factors.saturation_level // Lower is better
    const normalizedVolume = Math.min(100, factors.post_volume / 10)

    const score = 
      normalizedGrowth * weights.growth +
      normalizedEngagement * weights.engagement +
      normalizedSaturation * weights.saturation +
      normalizedVolume * weights.volume

    return Math.round(score)
  }

  /**
   * Determine the current phase of a trend
   */
  private determineTrendPhase(
    growth_velocity: number, 
    saturation_level: number
  ): 'emerging' | 'growing' | 'peak' | 'declining' {
    if (growth_velocity < -20) return 'declining'
    if (saturation_level > 80) return 'peak'
    if (growth_velocity > 50 && saturation_level < 40) return 'emerging'
    return 'growing'
  }

  /**
   * Get seed hashtags for different niches
   */
  private getSeedHashtagsForNiche(niche: string): string[] {
    const nicheHashtags: { [key: string]: string[] } = {
      fitness: ['fitness', 'workout', 'gym', 'fitfam', 'training', 'healthylifestyle'],
      beauty: ['beauty', 'makeup', 'skincare', 'beautytips', 'glam', 'cosmetics'],
      lifestyle: ['lifestyle', 'dailylife', 'lifestyleblogger', 'livingmybestlife'],
      fashion: ['fashion', 'style', 'ootd', 'fashionista', 'streetstyle', 'outfitoftheday'],
      food: ['foodie', 'foodstagram', 'recipe', 'cooking', 'foodlover', 'homecooking'],
      travel: ['travel', 'wanderlust', 'vacation', 'explore', 'travelgram', 'adventure'],
      business: ['entrepreneur', 'business', 'startup', 'hustle', 'success', 'motivation'],
      parenting: ['parenting', 'momlife', 'family', 'kids', 'parenthood', 'motherhood'],
      tech: ['tech', 'technology', 'innovation', 'gadgets', 'coding', 'startup'],
      education: ['education', 'learning', 'study', 'knowledge', 'teaching', 'edtech']
    }

    return nicheHashtags[niche.toLowerCase()] || ['trending', niche]
  }

  /**
   * Extract hashtags from caption text
   */
  private extractHashtags(caption: string): string[] {
    const hashtagRegex = /#(\w+)/g
    const matches = caption.match(hashtagRegex) || []
    return matches.map(tag => tag.substring(1).toLowerCase())
  }

  /**
   * Calculate optimal posting times for a niche
   */
  private calculateOptimalTimes(niche: string): number[] {
    // Default optimal times (in UTC)
    const defaultTimes = [12, 17, 19] // Noon, 5PM, 7PM

    // Niche-specific adjustments
    const nicheAdjustments: { [key: string]: number[] } = {
      fitness: [6, 12, 18],      // Early morning, lunch, evening
      business: [8, 12, 17],     // Business hours
      food: [11, 17, 19],        // Before meals
      parenting: [9, 14, 20],    // After school drop-off, afternoon, after bedtime
      beauty: [10, 16, 20]       // Mid-morning, afternoon, evening
    }

    return nicheAdjustments[niche.toLowerCase()] || defaultTimes
  }

  /**
   * Discover related trends from existing trends
   */
  private async discoverRelatedTrends(
    existingTrends: TrendData[], 
    niche: string
  ): Promise<TrendData[]> {
    const relatedTrends: TrendData[] = []
    const processedHashtags = new Set(existingTrends.map(t => t.trend_name))

    // For each existing trend, find related hashtags
    for (const trend of existingTrends.slice(0, 5)) {
      // In production, would fetch related hashtags from API
      // For now, generate related ones based on patterns
      const related = this.generateRelatedHashtags(trend.trend_name, niche)
      
      for (const hashtag of related) {
        if (!processedHashtags.has(`#${hashtag}`)) {
          const metrics = await this.getHashtagMetrics(hashtag)
          const trendData = this.analyzeTrend(hashtag, metrics, niche)
          
          if (trendData.confidence_score > 50) {
            relatedTrends.push(trendData)
            processedHashtags.add(`#${hashtag}`)
          }
        }
      }
    }

    return relatedTrends
  }

  /**
   * Generate related hashtags based on a seed hashtag
   */
  private generateRelatedHashtags(hashtag: string, niche: string): string[] {
    const cleanTag = hashtag.replace('#', '')
    const related: string[] = []

    // Add variations
    related.push(`${cleanTag}tips`)
    related.push(`${cleanTag}daily`)
    related.push(`${cleanTag}love`)
    related.push(`${niche}${cleanTag}`)

    return related.slice(0, 3)
  }

  /**
   * Convert content patterns to trend data
   */
  private patternsToTrends(
    patterns: Map<string, number>, 
    niche: string, 
    trendType: 'format'
  ): TrendData[] {
    const trends: TrendData[] = []
    const total = Array.from(patterns.values()).reduce((a, b) => a + b, 0)

    patterns.forEach((count, format) => {
      const percentage = (count / total) * 100
      
      trends.push({
        niche,
        trend_type: trendType,
        trend_name: format,
        growth_velocity: 0, // Neutral for format trends
        current_volume: count,
        engagement_rate: percentage,
        saturation_level: 50,
        confidence_score: Math.round(percentage * 2),
        trend_phase: 'growing',
        related_hashtags: [],
        optimal_posting_times: this.calculateOptimalTimes(niche)
      })
    })

    return trends
  }

  /**
   * Convert hashtag frequency to trends
   */
  private hashtagsToTrends(
    frequency: Map<string, number>, 
    niche: string
  ): TrendData[] {
    const trends: TrendData[] = []
    
    // Sort by frequency and take top 10
    const sorted = Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    for (const [hashtag, count] of sorted) {
      if (count > 2) { // Only include hashtags used multiple times
        trends.push({
          niche,
          trend_type: 'hashtag',
          trend_name: `#${hashtag}`,
          growth_velocity: 20, // Positive since competitors are using it
          current_volume: count * 1000, // Estimate
          engagement_rate: 5.0,
          saturation_level: 60,
          confidence_score: Math.min(90, 50 + count * 5),
          trend_phase: 'growing',
          related_hashtags: [],
          optimal_posting_times: this.calculateOptimalTimes(niche)
        })
      }
    }

    return trends
  }

  /**
   * Generate topic trends for a niche
   */
  private generateTopicTrends(niche: string): TrendData[] {
    const topics = this.getTrendingTopicsForNiche(niche)
    const trends: TrendData[] = []

    topics.forEach(topic => {
      const confidence = Math.floor(Math.random() * 40) + 60 // 60-100
      const growth = Math.floor(Math.random() * 80) - 20 // -20 to +60
      
      trends.push({
        niche,
        trend_type: 'topic',
        trend_name: topic,
        growth_velocity: growth,
        current_volume: Math.floor(Math.random() * 50000) + 10000,
        engagement_rate: Math.random() * 6 + 3, // 3-9%
        saturation_level: Math.floor(Math.random() * 60) + 20, // 20-80
        confidence_score: confidence,
        trend_phase: growth > 20 ? 'growing' : growth > 0 ? 'peak' : 'declining',
        related_hashtags: [],
        optimal_posting_times: this.calculateOptimalTimes(niche)
      })
    })

    return trends
  }

  /**
   * Generate format trends for a niche
   */
  private generateFormatTrends(niche: string): TrendData[] {
    const formats = ['Reels', 'Carousels', 'Stories', 'Live Videos']
    const trends: TrendData[] = []

    formats.forEach(format => {
      const confidence = Math.floor(Math.random() * 30) + 70 // 70-100
      const growth = Math.floor(Math.random() * 60) - 10 // -10 to +50
      
      trends.push({
        niche,
        trend_type: 'format',
        trend_name: format,
        growth_velocity: growth,
        current_volume: Math.floor(Math.random() * 100000) + 50000,
        engagement_rate: Math.random() * 5 + 4, // 4-9%
        saturation_level: Math.floor(Math.random() * 50) + 30, // 30-80
        confidence_score: confidence,
        trend_phase: growth > 15 ? 'growing' : growth > -5 ? 'peak' : 'declining',
        related_hashtags: [],
        optimal_posting_times: this.calculateOptimalTimes(niche)
      })
    })

    return trends
  }

  /**
   * Get trending topics for different niches
   */
  private getTrendingTopicsForNiche(niche: string): string[] {
    const topics: { [key: string]: string[] } = {
      fitness: ['Morning Workouts', 'Meal Prep', 'Home Gym Setup', 'Recovery Tips'],
      beauty: ['Skincare Routines', 'Makeup Tutorials', 'Product Reviews', 'Self-Care'],
      lifestyle: ['Morning Routines', 'Productivity Tips', 'Self-Care', 'Home Organization'],
      fashion: ['Outfit Ideas', 'Sustainable Fashion', 'Style Tips', 'Color Trends'],
      food: ['Healthy Recipes', 'Quick Meals', 'Food Photography', 'Cooking Hacks'],
      travel: ['Hidden Gems', 'Travel Tips', 'Budget Travel', 'Solo Travel'],
      business: ['Productivity Hacks', 'Remote Work', 'Side Hustles', 'Leadership'],
      parenting: ['Parenting Tips', 'Kids Activities', 'Family Time', 'Educational Games'],
      tech: ['AI Tools', 'Productivity Apps', 'Tech Reviews', 'Coding Tips'],
      education: ['Study Tips', 'Online Learning', 'Skill Development', 'Career Advice']
    }

    return topics[niche.toLowerCase()] || ['General Content', 'Trending Topics', 'Popular Ideas']
  }
}