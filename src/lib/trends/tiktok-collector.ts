export interface TikTokVideo {
  video_url: string
  transcription: string
  hashtags: string[]
  sounds: string[]
  engagement: {
    views: number
    likes: number
    comments: number
    shares: number
  }
}

export interface TikTokTrend {
  topic: string
  viral_score: number
  videos: TikTokVideo[]
  content_patterns: {
    hooks: string[]
    formats: string[]
    sounds: string[]
  }
  instagram_potential: string
}

export class TikTokCollector {
  private readonly MASA_API_BASE = 'https://data.masa.ai/api/v1'
  private readonly API_KEY = process.env.MASA_API_KEY
  
  /**
   * Analyze TikTok content for trends
   */
  async collectTrends(niche: string): Promise<TikTokTrend[]> {
    const videos = await this.getViralVideos(niche)
    const trends: TikTokTrend[] = []
    
    // Group videos by topic/theme
    const groupedVideos = this.groupVideosByTopic(videos)
    
    for (const [topic, topicVideos] of Object.entries(groupedVideos)) {
      const trend = await this.analyzeVideoGroup(topic, topicVideos)
      trends.push(trend)
    }
    
    return trends.sort((a, b) => b.viral_score - a.viral_score)
  }
  
  /**
   * Get viral videos for a niche
   */
  private async getViralVideos(niche: string): Promise<TikTokVideo[]> {
    // In production, this would search for viral videos in the niche
    // For now, return mock data
    const mockUrls = this.getMockVideoUrls(niche)
    const videos: TikTokVideo[] = []
    
    for (const url of mockUrls) {
      try {
        const transcription = await this.transcribeVideo(url)
        if (transcription) {
          videos.push({
            video_url: url,
            transcription,
            hashtags: this.extractHashtags(transcription),
            sounds: [], // Would extract from video metadata
            engagement: this.generateMockEngagement()
          })
        }
      } catch (error) {
        console.error(`Error processing video ${url}:`, error)
      }
    }
    
    return videos
  }
  
  /**
   * Transcribe a TikTok video using Masa AI
   */
  private async transcribeVideo(videoUrl: string): Promise<string> {
    if (!this.API_KEY) {
      console.log('No API key, using mock transcription')
      return this.getMockTranscription(videoUrl)
    }
    
    try {
      const response = await fetch(`${this.MASA_API_BASE}/search/live/tiktok`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'tiktok-transcription',
          arguments: {
            video_url: videoUrl,
            language: 'eng-US'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.transcription || ''
    } catch (error) {
      console.error('Transcription error:', error)
      return this.getMockTranscription(videoUrl)
    }
  }
  
  /**
   * Group videos by topic/theme
   */
  private groupVideosByTopic(videos: TikTokVideo[]): Record<string, TikTokVideo[]> {
    const groups: Record<string, TikTokVideo[]> = {}
    
    // Simple grouping by common themes in transcriptions
    videos.forEach(video => {
      const topic = this.extractMainTopic(video.transcription)
      if (!groups[topic]) groups[topic] = []
      groups[topic].push(video)
    })
    
    return groups
  }
  
  /**
   * Extract main topic from transcription
   */
  private extractMainTopic(transcription: string): string {
    const keywords = {
      'morning routine': ['morning', 'routine', 'wake up', 'start my day'],
      'workout tips': ['workout', 'exercise', 'fitness', 'gym'],
      'skincare': ['skin', 'skincare', 'routine', 'products'],
      'outfit ideas': ['outfit', 'ootd', 'style', 'fashion'],
      'cooking hacks': ['recipe', 'cooking', 'food', 'kitchen'],
      'productivity': ['productive', 'tips', 'hack', 'time management']
    }
    
    const lower = transcription.toLowerCase()
    
    for (const [topic, words] of Object.entries(keywords)) {
      if (words.some(word => lower.includes(word))) {
        return topic
      }
    }
    
    return 'general'
  }
  
  /**
   * Analyze a group of videos for patterns
   */
  private async analyzeVideoGroup(topic: string, videos: TikTokVideo[]): Promise<TikTokTrend> {
    // Extract common patterns
    const hooks = this.extractCommonHooks(videos)
    const formats = this.identifyVideoFormats(videos)
    const sounds = videos.flatMap(v => v.sounds).filter((s, i, arr) => arr.indexOf(s) === i)
    
    // Calculate viral score
    const totalEngagement = videos.reduce((sum, v) => 
      sum + v.engagement.views + v.engagement.likes * 10 + v.engagement.shares * 20, 0
    )
    const avgEngagement = totalEngagement / videos.length
    const viralScore = Math.min(100, Math.round(avgEngagement / 10000))
    
    // Determine Instagram potential
    const instagramPotential = this.calculateInstagramPotential(videos, viralScore)
    
    return {
      topic,
      viral_score: viralScore,
      videos: videos.slice(0, 3), // Top 3 videos
      content_patterns: {
        hooks,
        formats,
        sounds: sounds.slice(0, 3)
      },
      instagram_potential: instagramPotential
    }
  }
  
  /**
   * Extract common hooks from videos
   */
  private extractCommonHooks(videos: TikTokVideo[]): string[] {
    const hooks: string[] = []
    
    // Common TikTok hook patterns
    const hookPatterns = [
      /^(POV|pov):/i,
      /^(wait|Wait) (for|till|until)/i,
      /^(Watch|watch) (me|this)/i,
      /^(Here's|here's) how/i,
      /^(Story time|storytime)/i,
      /^(Things|things) (I|that)/i
    ]
    
    videos.forEach(video => {
      const firstLine = video.transcription.split('\n')[0]
      hookPatterns.forEach(pattern => {
        if (pattern.test(firstLine) && !hooks.includes(firstLine)) {
          hooks.push(firstLine)
        }
      })
    })
    
    return hooks.slice(0, 3)
  }
  
  /**
   * Identify video formats
   */
  private identifyVideoFormats(videos: TikTokVideo[]): string[] {
    const formats = new Set<string>()
    
    videos.forEach(video => {
      const trans = video.transcription.toLowerCase()
      
      if (trans.includes('step') || trans.includes('first')) {
        formats.add('Tutorial/How-to')
      }
      if (trans.includes('day in my life') || trans.includes('grwm')) {
        formats.add('Day in life/GRWM')
      }
      if (trans.includes('before') && trans.includes('after')) {
        formats.add('Transformation')
      }
      if (/\d+\./.test(trans)) {
        formats.add('Listicle')
      }
      if (trans.includes('story time') || trans.includes('storytime')) {
        formats.add('Storytime')
      }
    })
    
    return Array.from(formats)
  }
  
  /**
   * Calculate Instagram potential
   */
  private calculateInstagramPotential(videos: TikTokVideo[], viralScore: number): string {
    if (viralScore > 80) return 'High - Create Reels immediately'
    if (viralScore > 50) return 'Medium - Test with carousel posts'
    return 'Low - Monitor for growth'
  }
  
  /**
   * Extract hashtags from transcription
   */
  private extractHashtags(text: string): string[] {
    const matches = text.match(/#\w+/g) || []
    return matches.map(h => h.toLowerCase())
  }
  
  /**
   * Generate mock engagement data
   */
  private generateMockEngagement() {
    return {
      views: Math.floor(Math.random() * 1000000) + 10000,
      likes: Math.floor(Math.random() * 100000) + 1000,
      comments: Math.floor(Math.random() * 10000) + 100,
      shares: Math.floor(Math.random() * 5000) + 50
    }
  }
  
  /**
   * Get mock video URLs for testing
   */
  private getMockVideoUrls(niche: string): string[] {
    // In production, these would be real viral video URLs
    return [
      'https://www.tiktok.com/@example1/video/123',
      'https://www.tiktok.com/@example2/video/456',
      'https://www.tiktok.com/@example3/video/789'
    ]
  }
  
  /**
   * Get mock transcription for development
   */
  private getMockTranscription(videoUrl: string): string {
    const mockTranscriptions = [
      "POV: You finally found the perfect morning routine\n\nFirst, I wake up at 5am\nThen meditation for 10 minutes\nSkincare routine with these products\nHealthy breakfast prep\nAnd finally, workout time!\n\n#morningroutine #productivity #wellness",
      "Wait for the transformation...\n\nStarted with basic ingredients\nAdded this secret sauce\nMixed it all together\nAnd boom! Restaurant quality at home\n\n#cooking #foodhack #recipe",
      "Things nobody tells you about skincare:\n\n1. Less is more\n2. Patch test everything\n3. SPF is non-negotiable\n4. Consistency beats expensive products\n5. Your diet affects your skin\n\n#skincare #beautytips #glowup"
    ]
    
    return mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)]
  }
}