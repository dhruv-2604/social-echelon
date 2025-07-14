import { createClient } from '@supabase/supabase-js'
import { InstagramMedia } from '@/lib/instagram'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ContentSignal {
  user_id: string
  instagram_post_id: string
  caption_length: number
  word_count: number
  hashtag_count: number
  mention_count: number
  emoji_count: number
  line_break_count: number
  has_question: boolean
  has_call_to_action: boolean
  has_carousel: boolean
  has_reel: boolean
  video_duration?: number
  carousel_slides?: number
  posted_at: Date
  day_of_week: number
  hour_of_day: number
  reach_count: number
  like_count: number
  comment_count: number
  save_count: number
  share_count: number
  engagement_rate: number
  save_rate: number
  comment_rate: number
  performance_score: number
  follower_count_at_time: number
  user_niche: string
}

export class ContentAnalyzer {
  /**
   * Analyze a post and extract intelligence signals
   */
  analyzePost(
    post: InstagramMedia,
    insights: any,
    userProfile: any
  ): ContentSignal {
    const caption = post.caption || ''
    const postedAt = new Date(post.timestamp)
    
    // Extract content features
    const features = this.extractContentFeatures(caption)
    
    // Calculate performance metrics
    const reach = insights.reach || 0
    const likes = post.like_count || 0
    const comments = post.comments_count || 0
    const saves = insights.saved || 0
    
    const engagementRate = reach > 0 ? ((likes + comments + saves) / reach) * 100 : 0
    const saveRate = reach > 0 ? (saves / reach) * 100 : 0
    const commentRate = reach > 0 ? (comments / reach) * 100 : 0
    
    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(
      engagementRate,
      saveRate,
      reach,
      userProfile.follower_count
    )
    
    return {
      user_id: userProfile.id,
      instagram_post_id: post.id,
      
      // Content attributes
      caption_length: caption.length,
      word_count: features.wordCount,
      hashtag_count: features.hashtagCount,
      mention_count: features.mentionCount,
      emoji_count: features.emojiCount,
      line_break_count: features.lineBreakCount,
      
      // Content features
      has_question: features.hasQuestion,
      has_call_to_action: features.hasCallToAction,
      has_carousel: post.media_type === 'CAROUSEL_ALBUM',
      has_reel: post.media_type === 'VIDEO' || post.media_type === 'REELS',
      carousel_slides: post.media_type === 'CAROUSEL_ALBUM' ? 5 : undefined, // Estimate
      
      // Timing
      posted_at: postedAt,
      day_of_week: postedAt.getDay(),
      hour_of_day: postedAt.getHours(),
      
      // Performance
      reach_count: reach,
      like_count: likes,
      comment_count: comments,
      save_count: saves,
      share_count: 0, // Not available from API
      engagement_rate: Number(engagementRate.toFixed(2)),
      save_rate: Number(saveRate.toFixed(2)),
      comment_rate: Number(commentRate.toFixed(2)),
      performance_score: performanceScore,
      
      // Context
      follower_count_at_time: userProfile.follower_count,
      user_niche: userProfile.niche || 'general'
    }
  }

  /**
   * Extract features from caption text
   */
  private extractContentFeatures(caption: string) {
    // Count words
    const words = caption.split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length
    
    // Count hashtags
    const hashtags = caption.match(/#\w+/g) || []
    const hashtagCount = hashtags.length
    
    // Count mentions
    const mentions = caption.match(/@\w+/g) || []
    const mentionCount = mentions.length
    
    // Count emojis (simple regex for common emoji ranges)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    const emojis = caption.match(emojiRegex) || []
    const emojiCount = emojis.length
    
    // Count line breaks
    const lineBreaks = caption.match(/\n/g) || []
    const lineBreakCount = lineBreaks.length
    
    // Check for questions
    const hasQuestion = /\?/.test(caption)
    
    // Check for common CTAs
    const ctaPhrases = [
      'link in bio',
      'swipe up',
      'comment below',
      'save this',
      'share this',
      'tag a friend',
      'double tap',
      'click the link',
      'dm me',
      'check out'
    ]
    const lowerCaption = caption.toLowerCase()
    const hasCallToAction = ctaPhrases.some(phrase => lowerCaption.includes(phrase))
    
    return {
      wordCount,
      hashtagCount,
      mentionCount,
      emojiCount,
      lineBreakCount,
      hasQuestion,
      hasCallToAction
    }
  }

  /**
   * Calculate normalized performance score (0-100)
   */
  private calculatePerformanceScore(
    engagementRate: number,
    saveRate: number,
    reach: number,
    followerCount: number
  ): number {
    // Reach ratio (how much of audience was reached)
    const reachRatio = followerCount > 0 ? (reach / followerCount) : 0
    
    // Weight different metrics
    const weights = {
      engagement: 0.4,
      saves: 0.3,
      reach: 0.3
    }
    
    // Normalize each metric (rough benchmarks)
    const normalizedEngagement = Math.min(100, (engagementRate / 10) * 100) // 10% is excellent
    const normalizedSaves = Math.min(100, (saveRate / 2) * 100) // 2% save rate is excellent
    const normalizedReach = Math.min(100, reachRatio * 200) // 50% reach is excellent
    
    const score = 
      normalizedEngagement * weights.engagement +
      normalizedSaves * weights.saves +
      normalizedReach * weights.reach
    
    return Math.round(score)
  }

  /**
   * Store content signals in database
   */
  async storeContentSignal(signal: ContentSignal): Promise<void> {
    console.log('Storing signal for post:', signal.instagram_post_id)
    
    const { data, error } = await supabaseAdmin
      .from('content_signals')
      .upsert(signal, { onConflict: 'instagram_post_id' })
      .select()
    
    if (error) {
      console.error('Error storing content signal:', error)
      console.error('Signal data:', JSON.stringify(signal, null, 2))
    } else {
      console.log('Signal stored successfully:', data)
    }
  }

  /**
   * Analyze all posts for a user
   */
  async analyzeUserContent(userId: string): Promise<void> {
    console.log(`Analyzing content for user ${userId}`)
    
    // Get user's posts from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: posts } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', userId)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
    
    if (!posts || posts.length === 0) {
      console.log('No recent posts to analyze')
      return
    }
    
    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!profile) return
    
    // Analyze each post
    for (const post of posts) {
      // Use actual insights data from the Instagram post
      const insights = {
        reach: post.insights_reach || 0,
        saved: post.insights_saved || 0
      }
      
      const signal = this.analyzePost(post, insights, profile)
      await this.storeContentSignal(signal)
    }
    
    console.log(`Analyzed ${posts.length} posts for user ${userId}`)
    
    // Generate user insights after analyzing all posts
    await this.generateUserInsights(userId)
  }
  
  /**
   * Generate personalized insights for a user based on their content signals
   */
  async generateUserInsights(userId: string): Promise<void> {
    console.log(`Generating insights for user ${userId}`)
    
    // Get all content signals for this user
    const { data: signals } = await supabaseAdmin
      .from('content_signals')
      .select('*')
      .eq('user_id', userId)
      .order('performance_score', { ascending: false })
    
    if (!signals || signals.length === 0) {
      console.log('No signals to generate insights from')
      return
    }
    
    // Analyze top performing content (top 20%, minimum 2 posts)
    const topPercentile = Math.max(2, Math.ceil(signals.length * 0.2))
    const topSignals = signals.slice(0, Math.min(topPercentile, signals.length))
    
    // Calculate best caption length range
    const captionLengths = topSignals.map(s => s.caption_length).filter(len => len > 0).sort((a, b) => a - b)
    const minCaption = captionLengths.length > 0 ? captionLengths[0] : 100
    const maxCaption = captionLengths.length > 0 ? captionLengths[captionLengths.length - 1] : 300
    
    // Calculate best hashtag count
    const hashtagCounts = topSignals.map(s => s.hashtag_count)
    const avgHashtags = Math.round(hashtagCounts.reduce((a, b) => a + b, 0) / hashtagCounts.length)
    
    // Calculate best posting time
    const postingHours = topSignals.map(s => s.hour_of_day)
    const hourFrequency: Record<number, number> = {}
    postingHours.forEach(hour => {
      hourFrequency[hour] = (hourFrequency[hour] || 0) + 1
    })
    const bestHour = Number(Object.entries(hourFrequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0]) || 15
    
    // Calculate best day of week
    const daysOfWeek = topSignals.map(s => s.day_of_week)
    const dayFrequency: Record<number, number> = {}
    daysOfWeek.forEach(day => {
      dayFrequency[day] = (dayFrequency[day] || 0) + 1
    })
    const bestDay = Number(Object.entries(dayFrequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0]) || 3
    
    // Calculate best content format
    const formats = {
      reel: topSignals.filter(s => s.has_reel).length,
      carousel: topSignals.filter(s => s.has_carousel).length,
      image: topSignals.filter(s => !s.has_reel && !s.has_carousel).length
    }
    const bestFormat = Object.entries(formats)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'reel'
    
    // Calculate average metrics
    const avgReach = Math.round(signals.reduce((a, b) => a + b.reach_count, 0) / signals.length)
    const avgEngagement = Number((signals.reduce((a, b) => a + b.engagement_rate, 0) / signals.length).toFixed(2))
    const top10Reach = Math.round(topSignals.reduce((a, b) => a + b.reach_count, 0) / topSignals.length)
    
    // Store or update user insights
    const insights = {
      user_id: userId,
      best_caption_length: [minCaption, maxCaption],
      best_hashtag_count: avgHashtags,
      best_posting_hour: bestHour,
      best_day_of_week: bestDay,
      best_content_format: bestFormat,
      avg_reach: avgReach,
      avg_engagement_rate: avgEngagement,
      top_10_percent_reach: top10Reach,
      posts_analyzed: signals.length,  // Changed from total_posts_analyzed
      last_analyzed: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { error } = await supabaseAdmin
      .from('user_content_insights')
      .upsert(insights, { onConflict: 'user_id' })
    
    if (error) {
      console.error('Error storing user insights:', error)
    } else {
      console.log('User insights generated successfully')
    }
  }
}