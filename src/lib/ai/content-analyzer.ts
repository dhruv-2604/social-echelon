export interface UserPerformanceData {
  avgLikes: number
  avgComments: number
  avgEngagementRate: number
  topPerformingContentTypes: ContentTypePerformance[]
  bestPerformingPosts: InstagramPost[]
  weakestPerformingPosts: InstagramPost[]
  optimalPostingTimes: number[] // Hours in 24-format
  hashtagPerformance: HashtagPerformance[]
}

export interface ContentTypePerformance {
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  avgEngagement: number
  postCount: number
  performanceScore: number // 0-100
}

export interface HashtagPerformance {
  hashtag: string
  avgEngagement: number
  usage: number
  performanceScore: number
}

export interface InstagramPost {
  id: string
  media_type: string
  caption: string
  like_count: number
  comments_count: number
  timestamp: string
  engagement_rate: number
}

export class ContentAnalyzer {
  static analyzeUserPerformance(
    posts: InstagramPost[], 
    followerCount: number
  ): UserPerformanceData {
    if (posts.length === 0) {
      return this.getDefaultPerformanceData()
    }

    // Calculate averages
    const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0)
    const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0)
    const avgLikes = totalLikes / posts.length
    const avgComments = totalComments / posts.length
    const avgEngagementRate = followerCount > 0 
      ? ((avgLikes + avgComments) / followerCount) * 100 
      : 0

    // Analyze content types
    const contentTypeMap = new Map<string, {engagement: number[], count: number}>()
    posts.forEach(post => {
      const type = post.media_type
      const engagement = (post.like_count || 0) + (post.comments_count || 0)
      
      if (!contentTypeMap.has(type)) {
        contentTypeMap.set(type, { engagement: [], count: 0 })
      }
      
      contentTypeMap.get(type)!.engagement.push(engagement)
      contentTypeMap.get(type)!.count++
    })

    const topPerformingContentTypes: ContentTypePerformance[] = Array.from(contentTypeMap.entries())
      .map(([type, data]) => ({
        type: type as 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS',
        avgEngagement: data.engagement.reduce((sum, eng) => sum + eng, 0) / data.engagement.length,
        postCount: data.count,
        performanceScore: this.calculatePerformanceScore(data.engagement, avgLikes + avgComments)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)

    // Find best and worst performing posts
    const postsWithEngagement = posts.map(post => ({
      ...post,
      engagement_rate: followerCount > 0 
        ? (((post.like_count || 0) + (post.comments_count || 0)) / followerCount) * 100
        : 0
    }))

    const bestPerformingPosts = postsWithEngagement
      .sort((a, b) => b.engagement_rate - a.engagement_rate)
      .slice(0, 3)

    const weakestPerformingPosts = postsWithEngagement
      .sort((a, b) => a.engagement_rate - b.engagement_rate)
      .slice(0, 3)

    // Analyze posting times (basic implementation)
    const optimalPostingTimes = this.analyzeOptimalTimes(posts)

    // Analyze hashtags (basic implementation from captions)
    const hashtagPerformance = this.analyzeHashtags(posts)

    return {
      avgLikes,
      avgComments,
      avgEngagementRate,
      topPerformingContentTypes,
      bestPerformingPosts,
      weakestPerformingPosts,
      optimalPostingTimes,
      hashtagPerformance
    }
  }

  private static calculatePerformanceScore(engagements: number[], avgEngagement: number): number {
    const avgContentEngagement = engagements.reduce((sum, eng) => sum + eng, 0) / engagements.length
    return Math.min(100, (avgContentEngagement / Math.max(avgEngagement, 1)) * 100)
  }

  private static analyzeOptimalTimes(posts: InstagramPost[]): number[] {
    const hourMap = new Map<number, number>()
    
    posts.forEach(post => {
      const hour = new Date(post.timestamp).getHours()
      const engagement = (post.like_count || 0) + (post.comments_count || 0)
      hourMap.set(hour, (hourMap.get(hour) || 0) + engagement)
    })

    const sortedHours = Array.from(hourMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour)

    return sortedHours.length > 0 ? sortedHours : [9, 15, 19] // Default times
  }

  private static analyzeHashtags(posts: InstagramPost[]): HashtagPerformance[] {
    const hashtagMap = new Map<string, {engagement: number[], usage: number}>()
    
    posts.forEach(post => {
      const caption = post.caption || ''
      const hashtags = caption.match(/#\w+/g) || []
      const engagement = (post.like_count || 0) + (post.comments_count || 0)
      
      hashtags.forEach(hashtag => {
        const tag = hashtag.toLowerCase()
        if (!hashtagMap.has(tag)) {
          hashtagMap.set(tag, { engagement: [], usage: 0 })
        }
        hashtagMap.get(tag)!.engagement.push(engagement)
        hashtagMap.get(tag)!.usage++
      })
    })

    return Array.from(hashtagMap.entries())
      .map(([hashtag, data]) => ({
        hashtag,
        avgEngagement: data.engagement.reduce((sum, eng) => sum + eng, 0) / data.engagement.length,
        usage: data.usage,
        performanceScore: this.calculateHashtagScore(data.engagement, data.usage)
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 10)
  }

  private static calculateHashtagScore(engagements: number[], usage: number): number {
    const avgEngagement = engagements.reduce((sum, eng) => sum + eng, 0) / engagements.length
    const usageMultiplier = Math.min(usage / 3, 1) // Favor hashtags used multiple times
    return avgEngagement * usageMultiplier
  }

  private static getDefaultPerformanceData(): UserPerformanceData {
    return {
      avgLikes: 0,
      avgComments: 0,
      avgEngagementRate: 0,
      topPerformingContentTypes: [
        { type: 'REELS', avgEngagement: 0, postCount: 0, performanceScore: 85 },
        { type: 'CAROUSEL_ALBUM', avgEngagement: 0, postCount: 0, performanceScore: 75 },
        { type: 'IMAGE', avgEngagement: 0, postCount: 0, performanceScore: 65 },
        { type: 'VIDEO', avgEngagement: 0, postCount: 0, performanceScore: 70 }
      ],
      bestPerformingPosts: [],
      weakestPerformingPosts: [],
      optimalPostingTimes: [9, 15, 19],
      hashtagPerformance: []
    }
  }
}