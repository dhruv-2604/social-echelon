import OpenAI from 'openai'
import { UserPerformanceData } from './content-analyzer'
import { TrendEngine } from './trend-engine'

export interface UserProfile {
  niche: string
  primary_goal: 'growth' | 'engagement' | 'brand_partnerships' | 'sales'
  content_style: 'educational' | 'entertaining' | 'aspirational' | 'authentic'
  target_audience: string
  voice_tone: 'professional' | 'casual' | 'inspirational' | 'humorous'
  posting_frequency: number // posts per week
}

export interface ContentSuggestion {
  day: number // 1-7 for days of week
  post_type: 'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO'
  content_topic: string
  caption_outline: string
  suggested_hashtags: string[]
  optimal_posting_time: string
  reasoning: ReasoningBreakdown
  confidence_score: number // 0-100
}

export interface ReasoningBreakdown {
  performance_match: number // 0-100
  trend_alignment: number // 0-100
  algorithm_optimization: number // 0-100
  goal_progression: number // 0-100
  audience_relevance: number // 0-100
  explanation: string
}

export interface WeeklyContentPlan {
  user_id: string
  week_starting: string
  suggestions: ContentSuggestion[]
  overall_strategy: string
  generated_at: string
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export class ContentGenerator {
  static async generateWeeklyPlan(
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    userId: string,
    userPatterns?: any // Add user-specific patterns
  ): Promise<WeeklyContentPlan> {
    const trends = TrendEngine.getCurrentTrends()
    const contentTypePreferences = TrendEngine.getContentTypePreferences()
    
    // Generate the content mix for the week
    const contentMix = this.planWeeklyContentMix(
      userProfile, 
      performanceData, 
      contentTypePreferences
    )

    const suggestions: ContentSuggestion[] = []

    for (let day = 1; day <= userProfile.posting_frequency; day++) {
      const contentType = contentMix[day - 1]
      const suggestion = await this.generateContentSuggestion(
        day,
        contentType,
        userProfile,
        performanceData,
        trends,
        userPatterns
      )
      suggestions.push(suggestion)
    }

    const overallStrategy = await this.generateOverallStrategy(
      userProfile, 
      performanceData, 
      suggestions
    )

    return {
      user_id: userId,
      week_starting: this.getNextMonday(),
      suggestions,
      overall_strategy: overallStrategy,
      generated_at: new Date().toISOString()
    }
  }

  private static planWeeklyContentMix(
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    algorithmPrefs: any[]
  ): string[] {
    const { posting_frequency } = userProfile
    const mix: string[] = []

    // Prioritize based on user's historical performance and algorithm preferences
    const contentTypes = performanceData.topPerformingContentTypes.length > 0
      ? performanceData.topPerformingContentTypes
      : algorithmPrefs.map(pref => ({
          type: pref.content_type,
          performanceScore: pref.priority_score
        }))

    // Fill the week with optimal content types
    for (let i = 0; i < posting_frequency; i++) {
      const typeIndex = i % contentTypes.length
      mix.push(contentTypes[typeIndex].type)
    }

    return mix
  }

  private static async generateContentSuggestion(
    day: number,
    contentType: string,
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    trends: any,
    userPatterns?: any
  ): Promise<ContentSuggestion> {
    const trendingTopics = TrendEngine.getTrendingTopicsForNiche(userProfile.niche)
    const trendingHashtags = TrendEngine.getTrendingHashtagsForNiche(userProfile.niche)

    const prompt = this.buildContentPrompt(
      contentType,
      userProfile,
      performanceData,
      trendingTopics,
      day,
      userPatterns
    )

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Instagram content strategist and social media manager. Generate specific, actionable content suggestions that will drive engagement and help achieve user goals.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })

      const aiResponse = response.choices[0]?.message?.content || ''
      const parsedSuggestion = this.parseAIResponse(aiResponse, contentType)

      // Calculate reasoning and confidence
      const reasoning = this.calculateReasoning(
        parsedSuggestion.content_topic,
        contentType,
        userProfile,
        performanceData,
        trends
      )

      return {
        day,
        post_type: contentType as any,
        content_topic: parsedSuggestion.content_topic,
        caption_outline: parsedSuggestion.caption_outline,
        suggested_hashtags: [
          ...trendingHashtags.slice(0, 3),
          ...parsedSuggestion.additional_hashtags
        ].slice(0, 5),
        optimal_posting_time: this.getOptimalPostingTime(performanceData, day),
        reasoning,
        confidence_score: this.calculateConfidenceScore(reasoning)
      }
    } catch (error) {
      console.error('Error generating content suggestion:', error)
      return this.getFallbackSuggestion(day, contentType, userProfile, trendingHashtags)
    }
  }

  private static buildContentPrompt(
    contentType: string,
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    trendingTopics: string[],
    day: number,
    userPatterns?: any
  ): string {
    const bestPosts = performanceData.bestPerformingPosts
      .map(post => `"${post.caption?.substring(0, 100)}..." (${post.like_count} likes, ${post.comments_count} comments)`)
      .join('\n')

    return `
Create a ${contentType} content suggestion for day ${day} of the week for an Instagram creator with these details:

CREATOR PROFILE:
- Niche: ${userProfile.niche}
- Primary Goal: ${userProfile.primary_goal}
- Content Style: ${userProfile.content_style}
- Voice Tone: ${userProfile.voice_tone}
- Target Audience: ${userProfile.target_audience}

PERFORMANCE DATA:
- Average Engagement Rate: ${performanceData.avgEngagementRate.toFixed(2)}%
- Average Likes: ${performanceData.avgLikes}
- Average Comments: ${performanceData.avgComments}

BEST PERFORMING CONTENT:
${bestPosts || 'No historical data available'}

TRENDING TOPICS TO CONSIDER:
${trendingTopics.join(', ')}

${userPatterns ? `PROVEN PATTERNS FOR SUCCESS:
${userPatterns.caption_length ? `- Optimal caption length: ${userPatterns.caption_length.min}-${userPatterns.caption_length.max} characters` : ''}
${userPatterns.hashtag_count ? `- Best hashtag count: ${userPatterns.hashtag_count}` : ''}
${userPatterns.best_posting_hour ? `- Best posting time: ${userPatterns.best_posting_hour}:00` : ''}
${userPatterns.emoji_usage ? `- Emoji usage: ${userPatterns.emoji_usage}` : ''}
` : ''}
Please provide:
1. CONTENT_TOPIC: A specific, engaging topic/theme
2. CAPTION_OUTLINE: A structured caption outline (hook, body, call-to-action)
3. ADDITIONAL_HASHTAGS: 2-3 specific hashtags for this content (don't repeat trending ones)

Format your response as:
CONTENT_TOPIC: [topic]
CAPTION_OUTLINE: [outline]
ADDITIONAL_HASHTAGS: [hashtags]

Make the suggestion specific, actionable, and aligned with current trends while matching the creator's style and goals.
`
  }

  private static parseAIResponse(response: string, contentType: string): any {
    const lines = response.split('\n')
    let content_topic = ''
    let caption_outline = ''
    let additional_hashtags: string[] = []

    lines.forEach(line => {
      if (line.startsWith('CONTENT_TOPIC:')) {
        content_topic = line.replace('CONTENT_TOPIC:', '').trim()
      } else if (line.startsWith('CAPTION_OUTLINE:')) {
        caption_outline = line.replace('CAPTION_OUTLINE:', '').trim()
      } else if (line.startsWith('ADDITIONAL_HASHTAGS:')) {
        const hashtagText = line.replace('ADDITIONAL_HASHTAGS:', '').trim()
        additional_hashtags = hashtagText.split(',').map(h => h.trim()).filter(h => h)
      }
    })

    return {
      content_topic: content_topic || `${contentType} content idea`,
      caption_outline: caption_outline || 'Engaging caption outline',
      additional_hashtags: additional_hashtags.length > 0 ? additional_hashtags : ['#content', '#creator']
    }
  }

  private static calculateReasoning(
    contentTopic: string,
    contentType: string,
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    trends: any
  ): ReasoningBreakdown {
    // Performance Match: How well this content type has performed for the user
    const contentTypePerf = performanceData.topPerformingContentTypes
      .find(ct => ct.type === contentType)
    const performance_match = contentTypePerf ? contentTypePerf.performanceScore : 50

    // Trend Alignment: How well the topic aligns with current trends
    const trend_alignment = TrendEngine.getTrendAlignmentScore(contentTopic, userProfile.niche)

    // Algorithm Optimization: How well this content type performs on Instagram
    const algorithmPrefs = TrendEngine.getContentTypePreferences()
    const algoPref = algorithmPrefs.find(pref => pref.content_type === contentType)
    const algorithm_optimization = algoPref ? algoPref.priority_score : 60

    // Goal Progression: How well this helps achieve their primary goal
    const goal_progression = this.calculateGoalAlignment(contentType, userProfile.primary_goal)

    // Audience Relevance: How relevant this is to their target audience
    const audience_relevance = this.calculateAudienceRelevance(contentTopic, userProfile)

    const explanation = `This ${contentType.toLowerCase()} suggestion scores well because: ${contentTypePerf ? 'this content type has performed well for you historically' : 'this content type aligns with Instagram algorithm preferences'}, the topic aligns with current trends in your niche, and it supports your goal of ${userProfile.primary_goal}.`

    return {
      performance_match,
      trend_alignment,
      algorithm_optimization,
      goal_progression,
      audience_relevance,
      explanation
    }
  }

  private static calculateGoalAlignment(contentType: string, goal: string): number {
    const goalContentMap: { [key: string]: { [key: string]: number } } = {
      'growth': { 'REELS': 90, 'CAROUSEL_ALBUM': 70, 'VIDEO': 75, 'IMAGE': 60 },
      'engagement': { 'CAROUSEL_ALBUM': 90, 'REELS': 85, 'IMAGE': 70, 'VIDEO': 75 },
      'brand_partnerships': { 'IMAGE': 85, 'CAROUSEL_ALBUM': 80, 'REELS': 75, 'VIDEO': 70 },
      'sales': { 'CAROUSEL_ALBUM': 90, 'IMAGE': 80, 'REELS': 70, 'VIDEO': 65 }
    }

    return goalContentMap[goal]?.[contentType] || 70
  }

  private static calculateAudienceRelevance(topic: string, userProfile: UserProfile): number {
    // Simple keyword matching - can be enhanced with more sophisticated NLP
    const audienceKeywords = userProfile.target_audience.toLowerCase().split(' ')
    const topicLower = topic.toLowerCase()
    
    const matches = audienceKeywords.filter(keyword => 
      topicLower.includes(keyword) || keyword.length > 3 && topicLower.includes(keyword)
    ).length

    return Math.min(100, 60 + (matches * 15))
  }

  private static calculateConfidenceScore(reasoning: ReasoningBreakdown): number {
    const weights = {
      performance_match: 0.25,
      trend_alignment: 0.20,
      algorithm_optimization: 0.20,
      goal_progression: 0.20,
      audience_relevance: 0.15
    }

    return Math.round(
      reasoning.performance_match * weights.performance_match +
      reasoning.trend_alignment * weights.trend_alignment +
      reasoning.algorithm_optimization * weights.algorithm_optimization +
      reasoning.goal_progression * weights.goal_progression +
      reasoning.audience_relevance * weights.audience_relevance
    )
  }

  private static getOptimalPostingTime(performanceData: UserPerformanceData, day: number): string {
    const optimalHours = performanceData.optimalPostingTimes
    const hour = optimalHours[day % optimalHours.length] || 15
    
    const time = new Date()
    time.setHours(hour, 0, 0, 0)
    
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  private static async generateOverallStrategy(
    userProfile: UserProfile,
    performanceData: UserPerformanceData,
    suggestions: ContentSuggestion[]
  ): Promise<string> {
    const prompt = `
Create a brief overall strategy summary for this week's content plan:

USER GOAL: ${userProfile.primary_goal}
NICHE: ${userProfile.niche}
CONTENT STYLE: ${userProfile.content_style}

CONTENT MIX THIS WEEK:
${suggestions.map(s => `Day ${s.day}: ${s.post_type} - ${s.content_topic}`).join('\n')}

Provide a 2-3 sentence strategy overview explaining how this week's content works together to achieve their goals.
`

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a social media strategist. Provide clear, concise strategy summaries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 200
      })

      return response.choices[0]?.message?.content || 'Focus on consistent, engaging content that aligns with your niche and goals.'
    } catch (error) {
      return 'This week focuses on a balanced mix of content types to maximize engagement and support your growth goals.'
    }
  }

  private static getFallbackSuggestion(
    day: number,
    contentType: string,
    userProfile: UserProfile,
    hashtags: string[]
  ): ContentSuggestion {
    const fallbackTopics = {
      'REELS': 'Behind-the-scenes content',
      'CAROUSEL_ALBUM': 'Tips and insights',
      'IMAGE': 'Inspirational quote',
      'VIDEO': 'Tutorial or how-to'
    }

    return {
      day,
      post_type: contentType as any,
      content_topic: fallbackTopics[contentType as keyof typeof fallbackTopics],
      caption_outline: 'Hook + Value + Call to action',
      suggested_hashtags: hashtags.slice(0, 5),
      optimal_posting_time: '3:00 PM',
      reasoning: {
        performance_match: 70,
        trend_alignment: 60,
        algorithm_optimization: 75,
        goal_progression: 70,
        audience_relevance: 65,
        explanation: 'Fallback suggestion based on general best practices'
      },
      confidence_score: 68
    }
  }

  private static getNextMonday(): string {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    return nextMonday.toISOString().split('T')[0]
  }
}