export interface TrendData {
  trending_hashtags: string[]
  trending_topics: string[]
  seasonal_factors: SeasonalFactor[]
  algorithm_preferences: AlgorithmPreference[]
  niche_trends: { [niche: string]: NicheTrend }
}

export interface SeasonalFactor {
  factor: string
  relevance_score: number // 0-100
  suggested_content_types: string[]
}

export interface AlgorithmPreference {
  content_type: 'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO'
  priority_score: number // 0-100
  reasoning: string
}

export interface NicheTrend {
  trending_topics: string[]
  popular_hashtags: string[]
  content_styles: string[]
  engagement_boost: number // Multiplier for trend alignment
}

export class TrendEngine {
  private static currentTrends: TrendData = {
    trending_hashtags: [
      '#contentcreator', '#smallbusiness', '#entrepreneur', '#motivation',
      '#lifestyle', '#wellness', '#productivity', '#growthmindset',
      '#2024goals', '#inspiration', '#success', '#mindset'
    ],
    trending_topics: [
      'New Year goals and resolutions',
      'Productivity hacks and tips',
      'Behind-the-scenes content',
      'Personal growth and development',
      'Sustainable living',
      'Mental health awareness',
      'Educational content',
      'Day-in-the-life vlogs'
    ],
    seasonal_factors: [
      {
        factor: 'New Year motivation',
        relevance_score: 90,
        suggested_content_types: ['REELS', 'CAROUSEL_ALBUM']
      },
      {
        factor: 'Winter wellness focus',
        relevance_score: 75,
        suggested_content_types: ['IMAGE', 'CAROUSEL_ALBUM']
      }
    ],
    algorithm_preferences: [
      {
        content_type: 'REELS',
        priority_score: 95,
        reasoning: 'Instagram heavily prioritizes Reels in 2024 for reach and engagement'
      },
      {
        content_type: 'CAROUSEL_ALBUM',
        priority_score: 80,
        reasoning: 'Carousels generate high engagement and save rates'
      },
      {
        content_type: 'IMAGE',
        priority_score: 60,
        reasoning: 'Single images still perform well for high-quality content'
      },
      {
        content_type: 'VIDEO',
        priority_score: 70,
        reasoning: 'Native videos get good reach but Reels are preferred'
      }
    ],
    niche_trends: {
      'fitness': {
        trending_topics: ['New Year fitness goals', 'Home workouts', 'Healthy meal prep'],
        popular_hashtags: ['#fitness', '#workout', '#healthylifestyle', '#fitnessmotivation'],
        content_styles: ['transformation posts', 'workout tutorials', 'meal prep videos'],
        engagement_boost: 1.3
      },
      'lifestyle': {
        trending_topics: ['Morning routines', 'Self-care tips', 'Productivity hacks'],
        popular_hashtags: ['#lifestyle', '#selfcare', '#morningroutine', '#productivity'],
        content_styles: ['day-in-the-life', 'aesthetic flat lays', 'tips and tricks'],
        engagement_boost: 1.2
      },
      'business': {
        trending_topics: ['Entrepreneurship tips', 'Small business growth', 'Side hustles'],
        popular_hashtags: ['#entrepreneur', '#smallbusiness', '#businesstips', '#sidehustle'],
        content_styles: ['educational carousels', 'success stories', 'behind-the-scenes'],
        engagement_boost: 1.4
      },
      'fashion': {
        trending_topics: ['Outfit ideas', 'Sustainable fashion', 'Style tips'],
        popular_hashtags: ['#fashion', '#style', '#outfit', '#sustainablefashion'],
        content_styles: ['outfit posts', 'styling tips', 'trend alerts'],
        engagement_boost: 1.1
      },
      'food': {
        trending_topics: ['Healthy recipes', 'Quick meals', 'Food photography'],
        popular_hashtags: ['#foodie', '#recipe', '#healthyfood', '#cooking'],
        content_styles: ['recipe videos', 'food photography', 'cooking tips'],
        engagement_boost: 1.2
      },
      'general': {
        trending_topics: ['Personal growth', 'Motivation', 'Life updates'],
        popular_hashtags: ['#motivation', '#inspiration', '#growth', '#lifestyle'],
        content_styles: ['motivational posts', 'personal stories', 'tips and advice'],
        engagement_boost: 1.0
      }
    }
  }

  static getCurrentTrends(): TrendData {
    return this.currentTrends
  }

  static getTrendingHashtagsForNiche(niche: string): string[] {
    const niche_data = this.currentTrends.niche_trends[niche.toLowerCase()] || 
                      this.currentTrends.niche_trends['general']
    
    return [
      ...niche_data.popular_hashtags.slice(0, 3),
      ...this.currentTrends.trending_hashtags.slice(0, 2)
    ]
  }

  static getTrendingTopicsForNiche(niche: string): string[] {
    const niche_data = this.currentTrends.niche_trends[niche.toLowerCase()] || 
                      this.currentTrends.niche_trends['general']
    
    return [
      ...niche_data.trending_topics,
      ...this.currentTrends.trending_topics.slice(0, 3)
    ]
  }

  static getContentTypePreferences(): AlgorithmPreference[] {
    return this.currentTrends.algorithm_preferences
  }

  static getSeasonalFactors(): SeasonalFactor[] {
    return this.currentTrends.seasonal_factors
  }

  static getTrendAlignmentScore(contentTopic: string, niche: string): number {
    const niche_data = this.currentTrends.niche_trends[niche.toLowerCase()] || 
                      this.currentTrends.niche_trends['general']
    
    const topicLower = contentTopic.toLowerCase()
    
    // Check if topic aligns with trending topics
    const topicMatch = [
      ...niche_data.trending_topics,
      ...this.currentTrends.trending_topics
    ].some(trend => 
      topicLower.includes(trend.toLowerCase()) || 
      trend.toLowerCase().includes(topicLower)
    )

    // Check seasonal relevance
    const seasonalMatch = this.currentTrends.seasonal_factors.some(factor =>
      topicLower.includes(factor.factor.toLowerCase())
    )

    let score = 50 // Base score
    if (topicMatch) score += 30
    if (seasonalMatch) score += 20

    return Math.min(100, score)
  }

  static getEngagementBoostForNiche(niche: string): number {
    const niche_data = this.currentTrends.niche_trends[niche.toLowerCase()] || 
                      this.currentTrends.niche_trends['general']
    return niche_data.engagement_boost
  }

  // Method to update trends (for future real-time trend integration)
  static updateTrends(newTrends: Partial<TrendData>): void {
    this.currentTrends = { ...this.currentTrends, ...newTrends }
  }
}