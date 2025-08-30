import { ApifyClient } from 'apify-client'

interface TwitterUser {
  id: string
  url: string
  name: string
  username: string
  created_at: string
  followers_count: number
  profile_image_url: string
}

interface TwitterTweet {
  user: TwitterUser
  id: string
  text: string
  retweet_count: number
  like_count: number
  reply_count?: number
  created_at: string
  url: string
  hashtags: string[]
}

interface TwitterTrendData {
  platform: 'twitter'
  trend_type: 'hashtag' | 'topic' | 'keyword'
  trend_name: string
  tweet_count: number
  total_engagement: number
  avg_engagement: number
  top_tweets: TwitterTweet[]
  trending_topics: Map<string, number>
  growth_rate: number
  confidence_score: number
}

export class TwitterTrendCollector {
  private client: ApifyClient
  private readonly ACTOR_ID = 'datura/twitter-search-scraper' // Update with actual actor ID
  
  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_TOKEN || ''
    })
  }

  /**
   * Collect Twitter trends for a specific niche
   */
  async collectNicheTrends(
    niche: string,
    hashtags: string[],
    options: {
      maxTweets?: number
      minLikes?: number
      minRetweets?: number
      daysBack?: number
    } = {}
  ): Promise<TwitterTrendData[]> {
    const {
      maxTweets = 100,
      minLikes = 50,
      minRetweets = 20,
      daysBack = 1
    } = options

    console.log(`🐦 Collecting Twitter trends for ${niche}`)
    
    const trends: TwitterTrendData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    
    try {
      // Build query from hashtags
      const query = hashtags.map(tag => `#${tag}`).join(' OR ')
      
      // Run the Twitter scraper actor
      const run = await this.client.actor(this.ACTOR_ID).call({
        query,
        sort: 'Top',
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        lang: 'en',
        min_likes: minLikes,
        min_retweets: minRetweets,
        count: maxTweets
      })

      const tweets = (run.defaultDatasetId 
        ? await this.client.dataset(run.defaultDatasetId).listItems()
        : { items: [] }).items as TwitterTweet[]

      if (tweets.length === 0) {
        console.warn(`No tweets found for ${niche}`)
        return []
      }

      // Analyze collected tweets
      const trendAnalysis = this.analyzeTweets(tweets, niche)
      
      // Convert to trend format
      for (const [trendName, data] of trendAnalysis.entries()) {
        trends.push({
          platform: 'twitter',
          trend_type: trendName.startsWith('#') ? 'hashtag' : 'topic',
          trend_name: trendName,
          tweet_count: data.count,
          total_engagement: data.totalEngagement,
          avg_engagement: data.totalEngagement / data.count,
          top_tweets: data.topTweets,
          trending_topics: data.relatedTopics,
          growth_rate: this.calculateGrowthRate(data.tweets),
          confidence_score: this.calculateConfidence(data)
        })
      }

      console.log(`✅ Collected ${trends.length} Twitter trends for ${niche}`)
      
    } catch (error) {
      console.error(`Error collecting Twitter trends for ${niche}:`, error)
    }

    return trends
  }

  /**
   * Analyze tweets to extract trends
   */
  private analyzeTweets(tweets: TwitterTweet[], niche: string) {
    const trendMap = new Map<string, {
      count: number
      totalEngagement: number
      tweets: TwitterTweet[]
      topTweets: TwitterTweet[]
      relatedTopics: Map<string, number>
    }>()

    for (const tweet of tweets) {
      // Extract hashtags as trends
      for (const hashtag of tweet.hashtags) {
        const key = `#${hashtag.toLowerCase()}`
        if (!trendMap.has(key)) {
          trendMap.set(key, {
            count: 0,
            totalEngagement: 0,
            tweets: [],
            topTweets: [],
            relatedTopics: new Map()
          })
        }
        
        const trend = trendMap.get(key)!
        trend.count++
        trend.totalEngagement += (tweet.like_count + tweet.retweet_count * 2 + (tweet.reply_count || 0))
        trend.tweets.push(tweet)
        
        // Track related topics from tweet text
        this.extractTopics(tweet.text).forEach(topic => {
          trend.relatedTopics.set(topic, (trend.relatedTopics.get(topic) || 0) + 1)
        })
      }

      // Also track the niche itself as a trend
      if (!trendMap.has(niche)) {
        trendMap.set(niche, {
          count: 0,
          totalEngagement: 0,
          tweets: [],
          topTweets: [],
          relatedTopics: new Map()
        })
      }
      
      const nicheTrend = trendMap.get(niche)!
      nicheTrend.count++
      nicheTrend.totalEngagement += (tweet.like_count + tweet.retweet_count * 2 + (tweet.reply_count || 0))
      nicheTrend.tweets.push(tweet)
    }

    // Sort and get top tweets for each trend
    for (const [_, data] of trendMap.entries()) {
      data.topTweets = data.tweets
        .sort((a, b) => {
          const engagementA = a.like_count + a.retweet_count * 2
          const engagementB = b.like_count + b.retweet_count * 2
          return engagementB - engagementA
        })
        .slice(0, 5)
    }

    return trendMap
  }

  /**
   * Extract topics from tweet text
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = []
    
    // Extract words that appear to be topics (capitalized, longer than 4 chars)
    const words = text.split(/\s+/)
    for (const word of words) {
      // Skip URLs, mentions, and hashtags
      if (word.startsWith('http') || word.startsWith('@') || word.startsWith('#')) {
        continue
      }
      
      // Look for capitalized words or phrases
      if (word.length > 4 && /^[A-Z]/.test(word)) {
        topics.push(word.toLowerCase())
      }
    }
    
    return topics
  }

  /**
   * Calculate growth rate based on tweet timestamps
   */
  private calculateGrowthRate(tweets: TwitterTweet[]): number {
    if (tweets.length < 2) return 0

    // Sort tweets by date
    const sorted = tweets.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Compare first half vs second half engagement
    const midpoint = Math.floor(sorted.length / 2)
    const firstHalf = sorted.slice(0, midpoint)
    const secondHalf = sorted.slice(midpoint)

    const firstHalfEngagement = firstHalf.reduce((sum, t) => 
      sum + t.like_count + t.retweet_count * 2, 0
    ) / firstHalf.length

    const secondHalfEngagement = secondHalf.reduce((sum, t) => 
      sum + t.like_count + t.retweet_count * 2, 0
    ) / secondHalf.length

    if (firstHalfEngagement === 0) return 100
    
    return ((secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement) * 100
  }

  /**
   * Calculate confidence score for a trend
   */
  private calculateConfidence(data: {
    count: number
    totalEngagement: number
    tweets: TwitterTweet[]
  }): number {
    let score = 50 // Base score

    // More tweets = higher confidence
    if (data.count >= 50) score += 20
    else if (data.count >= 20) score += 15
    else if (data.count >= 10) score += 10
    else if (data.count >= 5) score += 5

    // Higher engagement = higher confidence
    const avgEngagement = data.totalEngagement / data.count
    if (avgEngagement >= 1000) score += 20
    else if (avgEngagement >= 500) score += 15
    else if (avgEngagement >= 100) score += 10
    else if (avgEngagement >= 50) score += 5

    // Consistent engagement across tweets
    const engagements = data.tweets.map(t => t.like_count + t.retweet_count * 2)
    const stdDev = this.calculateStdDev(engagements)
    const avgEng = engagements.reduce((a, b) => a + b, 0) / engagements.length
    const coefficientOfVariation = avgEng > 0 ? stdDev / avgEng : 1
    
    if (coefficientOfVariation < 0.5) score += 10 // Very consistent
    else if (coefficientOfVariation < 1) score += 5  // Somewhat consistent

    return Math.min(100, score)
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const n = values.length
    if (n === 0) return 0
    
    const mean = values.reduce((a, b) => a + b) / n
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / n
    
    return Math.sqrt(avgSquaredDiff)
  }

  /**
   * Get Twitter-specific hashtags for a niche
   * These might differ from Instagram hashtags
   */
  static getTwitterHashtags(niche: string): string[] {
    const twitterHashtags: Record<string, string[]> = {
      fitness: ['fitness', 'gym', 'workout', 'fitfam', 'gymmotivation', 'fitnessjourney', 'training', 'exercise', 'fitnessmotivation', 'healthylifestyle'],
      beauty: ['beauty', 'makeup', 'skincare', 'beautytips', 'makeuptutorial', 'beautyblogger', 'skincareroutine', 'cosmetics', 'beautycommunity', 'makeupjunkie'],
      lifestyle: ['lifestyle', 'lifestyleblogger', 'wellness', 'selfcare', 'mindfulness', 'dailylife', 'lifegoals', 'inspiration', 'motivation', 'lifehacks'],
      fashion: ['fashion', 'ootd', 'style', 'fashionista', 'fashionblogger', 'streetstyle', 'fashionweek', 'styleinspo', 'fashiontrends', 'outfitoftheday'],
      food: ['foodie', 'foodporn', 'recipe', 'cooking', 'foodblogger', 'homecooking', 'foodstagram', 'yummy', 'delicious', 'foodlover'],
      travel: ['travel', 'wanderlust', 'travelgram', 'vacation', 'travelphotography', 'explore', 'adventure', 'traveltheworld', 'tourism', 'travelblogger'],
      business: ['entrepreneur', 'business', 'startup', 'smallbusiness', 'marketing', 'success', 'businessowner', 'entrepreneurship', 'leadership', 'businesstips'],
      parenting: ['parenting', 'momlife', 'parenthood', 'kids', 'family', 'motherhood', 'dadlife', 'parentingtips', 'familylife', 'mommy'],
      tech: ['tech', 'technology', 'ai', 'coding', 'innovation', 'programming', 'developer', 'software', 'artificialintelligence', 'techtrends'],
      education: ['education', 'learning', 'edtech', 'teaching', 'students', 'elearning', 'study', 'knowledge', 'training', 'onlinelearning']
    }
    
    return twitterHashtags[niche] || ['trending', niche]
  }
}