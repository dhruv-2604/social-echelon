/**
 * Apify Instagram Scraper Integration for Trend Detection
 * Uses apidojo/instagram-scraper - $0.50 per 1000 posts
 */

import { ApifyClient } from 'apify-client'

interface InstagramPost {
  id: string
  url: string
  createdAt: string
  likeCount: number
  commentCount: number
  playCount?: number
  caption: string
  owner: {
    username: string
    followerCount: number
  }
  audio?: {
    title: string
    artist: string
  }
  location?: {
    name: string
  }
  noResults?: boolean // Apify returns this when scraping fails
}

interface TrendData {
  hashtag: string
  postCount: number
  totalEngagement: number
  avgEngagement: number
  topPosts: InstagramPost[]
  trendingAudio: Map<string, number>
  growthRate?: number
}

export class ApifyInstagramCollector {
  private client: ApifyClient
  
  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_TOKEN || ''
    })
  }

  /**
   * Collect trending data for multiple hashtags
   */
  async collectHashtagTrends(hashtags: string[], maxPostsPerTag = 500): Promise<TrendData[]> {
    console.log(`🔍 Collecting trends for ${hashtags.length} hashtags`)
    
    const trends: TrendData[] = []
    
    for (const hashtag of hashtags) {
      try {
        const trend = await this.analyzeHashtag(hashtag, maxPostsPerTag)
        trends.push(trend)
        
        // Small delay between hashtags to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error collecting ${hashtag}:`, error)
      }
    }
    
    return trends
  }

  /**
   * Analyze a single hashtag for trends
   */
  private async analyzeHashtag(hashtag: string, maxPosts = 500): Promise<TrendData> {
    console.log(`📊 Analyzing #${hashtag}`)
    
    // Clean hashtag (remove # if present)
    const cleanTag = hashtag.replace('#', '')
    
    // Run the scraper
    const run = await this.client.actor('apidojo/instagram-scraper').call({
      startUrls: [`https://www.instagram.com/explore/tags/${cleanTag}/`],
      maxItems: maxPosts,
      // Get posts from last 7 days for trend analysis
      until: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    })
    
    // Get the results
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems() as any
    
    // Analyze the data
    const trendingAudio = new Map<string, number>()
    let totalEngagement = 0
    
    // Sort by engagement to find top posts
    const sortedPosts = items.sort((a: any, b: any) => {
      const engagementA = a.likeCount + a.commentCount + (a.playCount || 0)
      const engagementB = b.likeCount + b.commentCount + (b.playCount || 0)
      return engagementB - engagementA
    })
    
    // Process each post
    items.forEach((post: any) => {
      // Calculate engagement
      const engagement = post.likeCount + post.commentCount + (post.playCount || 0)
      totalEngagement += engagement
      
      // Track audio trends - check multiple possible audio fields
      if (post.audio) {
        const audioKey = `${post.audio.artist || 'Unknown'} - ${post.audio.title || 'Unknown'}`
        trendingAudio.set(audioKey, (trendingAudio.get(audioKey) || 0) + 1)
      } else if (post.musicInfo) {
        // Alternative field for audio
        const audioKey = `${post.musicInfo.artist || 'Unknown'} - ${post.musicInfo.title || 'Unknown'}`
        trendingAudio.set(audioKey, (trendingAudio.get(audioKey) || 0) + 1)
      } else if (post.caption && post.caption.includes('🎵')) {
        // Try to extract audio mentions from caption
        const audioMatch = post.caption.match(/🎵\s*([^🎵\n]+)/);
        if (audioMatch) {
          trendingAudio.set(audioMatch[1].trim(), (trendingAudio.get(audioMatch[1].trim()) || 0) + 1)
        }
      }
    })
    
    // Calculate growth rate (comparing older posts vs newer posts)
    // Since Instagram returns posts newest first, we need to reverse the comparison
    const midPoint = Math.floor(items.length / 2)
    const newerPosts = items.slice(0, midPoint) // First half = newer
    const olderPosts = items.slice(midPoint)    // Second half = older
    
    const newerEngagement = newerPosts.reduce((sum: number, post: any) => 
      sum + post.likeCount + post.commentCount, 0)
    const olderEngagement = olderPosts.reduce((sum: number, post: any) => 
      sum + post.likeCount + post.commentCount, 0)
    
    // Growth rate: how much better are newer posts doing vs older posts
    // Cap at reasonable values to avoid extreme percentages
    let growthRate = 0
    if (olderEngagement > 0 && olderPosts.length > 0 && newerPosts.length > 0) {
      const avgOlder = olderEngagement / olderPosts.length
      const avgNewer = newerEngagement / newerPosts.length
      growthRate = ((avgNewer - avgOlder) / avgOlder) * 100
      // Cap growth rate at -90% to +200% to avoid outliers
      growthRate = Math.max(-90, Math.min(200, growthRate))
    }
    
    return {
      hashtag: cleanTag,
      postCount: items.length,
      totalEngagement,
      avgEngagement: totalEngagement / items.length,
      topPosts: sortedPosts.slice(0, 10), // Top 10 posts
      trendingAudio,
      growthRate
    }
  }

  /**
   * Find trending audio across multiple hashtags
   */
  async findTrendingAudio(niches: string[]): Promise<Map<string, number>> {
    console.log(`🎵 Finding trending audio across ${niches.length} niches`)
    
    const audioTrends = new Map<string, number>()
    
    for (const niche of niches) {
      try {
        // Scrape posts from audio pages or hashtags
        const run = await this.client.actor('apidojo/instagram-scraper').call({
          startUrls: [`https://www.instagram.com/explore/tags/${niche}/`],
          maxItems: 200 // Less posts needed for audio analysis
        })
        
        const { items } = await this.client.dataset(run.defaultDatasetId).listItems() as any
        
        // Aggregate audio usage
        items.forEach((post: any) => {
          if (post.audio) {
            const audioKey = `${post.audio.artist} - ${post.audio.title}`
            audioTrends.set(audioKey, (audioTrends.get(audioKey) || 0) + 1)
          }
        })
        
      } catch (error) {
        console.error(`Error collecting audio for ${niche}:`, error)
      }
    }
    
    // Sort by popularity
    return new Map([...audioTrends.entries()].sort((a, b) => b[1] - a[1]))
  }

  /**
   * Analyze location-based trends
   */
  async analyzeLocationTrends(locationUrls: string[]): Promise<any[]> {
    console.log(`📍 Analyzing ${locationUrls.length} locations`)
    
    const run = await this.client.actor('apidojo/instagram-scraper').call({
      startUrls: locationUrls,
      maxItems: 100 // Per location
    })
    
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
    
    // Group by location and analyze
    const locationGroups = new Map<string, any[]>()
    
    items.forEach((post: any) => {
      if (post.location) {
        const locName = post.location.name
        if (!locationGroups.has(locName)) {
          locationGroups.set(locName, [])
        }
        locationGroups.get(locName)!.push(post)
      }
    })
    
    // Analyze each location
    const locationTrends = []
    for (const [location, posts] of locationGroups) {
      const totalEngagement = posts.reduce((sum, post) => 
        sum + post.likeCount + post.commentCount, 0)
      
      locationTrends.push({
        location,
        postCount: posts.length,
        avgEngagement: totalEngagement / posts.length,
        topPost: posts.sort((a, b) => b.likeCount - a.likeCount)[0]
      })
    }
    
    return locationTrends
  }

  /**
   * Get competitor insights
   */
  async analyzeCompetitors(usernames: string[]): Promise<any[]> {
    console.log(`🔍 Analyzing ${usernames.length} competitors`)
    
    const profileUrls = usernames.map(u => `https://www.instagram.com/${u}/`)
    
    const run = await this.client.actor('apidojo/instagram-scraper').call({
      startUrls: profileUrls,
      maxItems: 50 // Recent posts per profile
    })
    
    const { items } = await this.client.dataset(run.defaultDatasetId).listItems()
    
    // Group by owner and analyze
    const competitorData = new Map<string, any>()
    
    items.forEach((post: any) => {
      const username = post.owner.username
      
      if (!competitorData.has(username)) {
        competitorData.set(username, {
          username,
          followerCount: post.owner.followerCount,
          posts: [],
          totalEngagement: 0,
          topHashtags: new Map<string, number>(),
          postingTimes: []
        })
      }
      
      const data = competitorData.get(username)!
      data.posts.push(post)
      data.totalEngagement += post.likeCount + post.commentCount
      data.postingTimes.push(new Date(post.createdAt).getHours())
      
      // Extract hashtags from caption
      const hashtags = post.caption.match(/#\w+/g) || []
      hashtags.forEach((tag: string) => {
        data.topHashtags.set(tag, (data.topHashtags.get(tag) || 0) + 1)
      })
    })
    
    return Array.from(competitorData.values()).map(competitor => ({
      ...competitor,
      avgEngagement: competitor.totalEngagement / competitor.posts.length,
      engagementRate: (competitor.totalEngagement / competitor.posts.length) / competitor.followerCount * 100,
      topHashtags: Array.from(competitor.topHashtags.entries())
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10),
      bestPostingTime: this.getMostFrequent(competitor.postingTimes)
    }))
  }

  /**
   * Helper to find most frequent value
   */
  private getMostFrequent(arr: number[]): number {
    const frequency = new Map<number, number>()
    arr.forEach(val => frequency.set(val, (frequency.get(val) || 0) + 1))
    
    let maxFreq = 0
    let mostFrequent = 0
    
    frequency.forEach((freq, val) => {
      if (freq > maxFreq) {
        maxFreq = freq
        mostFrequent = val
      }
    })
    
    return mostFrequent
  }
}