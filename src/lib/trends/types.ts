export interface TrendData {
  id?: string
  niche: string
  trend_type: 'hashtag' | 'topic' | 'format' | 'audio'
  trend_name: string
  
  // Scoring metrics
  growth_velocity: number      // -100 to +100 (declining to explosive)
  current_volume: number       // estimated reach
  engagement_rate: number      // avg engagement on trend content
  saturation_level: number     // 0-100 (fresh to oversaturated)
  confidence_score: number     // 0-100 overall confidence
  
  // Timing
  first_detected?: Date
  peak_time?: Date | null
  trend_phase: 'emerging' | 'growing' | 'peak' | 'declining'
  
  // Meta data
  related_hashtags: string[]
  example_posts?: any[]
  optimal_posting_times: number[] // hours in UTC
}

export interface HashtagMetrics {
  hashtag: string
  post_count: number
  recent_posts: number // posts in last 24h
  avg_likes: number
  avg_comments: number
  engagement_rate: number
  top_posts: any[]
}

export interface NicheCompetitor {
  id?: string
  niche: string
  instagram_username: string
  instagram_id?: string
  follower_count: number
  engagement_rate: number
  content_style?: string
  is_verified?: boolean
}

export interface TrendAnalysis {
  trends: TrendData[]
  niche_summary: {
    hot_topics: string[]
    best_posting_times: number[]
    content_format_mix: { [key: string]: number }
    avg_engagement_rate: number
  }
}