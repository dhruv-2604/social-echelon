import { ApifyInstagramCollector } from './apify-instagram-collector'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface AudioTrend {
  track: string
  artist: string
  usageCount: number
  niches: string[]
  avgEngagement: number
  growthRate: number
  topPosts: any[]
}

export class AudioTrendAggregator {
  private collector: ApifyInstagramCollector
  
  constructor() {
    this.collector = new ApifyInstagramCollector()
  }
  
  /**
   * Collect audio trends across multiple niches for better pattern detection
   */
  async collectCrossPlatformAudioTrends(): Promise<AudioTrend[]> {
    console.log('Starting cross-platform audio trend collection...')
    
    const audioMap = new Map<string, AudioTrend>()
    
    // Focus on niches with high audio usage
    const audioFocusedNiches = [
      { niche: 'fitness', hashtags: ['workout', 'gym', 'fitnessmotivation'] },
      { niche: 'beauty', hashtags: ['makeup', 'glowup', 'getreadywithme'] },
      { niche: 'lifestyle', hashtags: ['morningroutine', 'dayinmylife', 'aesthetic'] },
      { niche: 'fashion', hashtags: ['ootd', 'outfit', 'grwm'] },
      { niche: 'food', hashtags: ['cooking', 'recipe', 'foodie'] }
    ]
    
    for (const { niche, hashtags } of audioFocusedNiches) {
      try {
        // Collect 300 posts per hashtag for audio analysis
        const trends = await this.collector.collectHashtagTrends(hashtags, 300)
        
        // Aggregate audio data
        for (const trend of trends) {
          if (trend.trendingAudio && trend.trendingAudio.size > 0) {
            for (const [audioName, count] of trend.trendingAudio) {
              const [artist, track] = this.parseAudioName(audioName)
              const key = `${artist}-${track}`.toLowerCase()
              
              if (!audioMap.has(key)) {
                audioMap.set(key, {
                  track,
                  artist,
                  usageCount: 0,
                  niches: [],
                  avgEngagement: 0,
                  growthRate: 0,
                  topPosts: []
                })
              }
              
              const audio = audioMap.get(key)!
              audio.usageCount += count
              if (!audio.niches.includes(niche)) {
                audio.niches.push(niche)
              }
              audio.avgEngagement = (audio.avgEngagement + trend.avgEngagement) / 2
              audio.growthRate = Math.max(audio.growthRate, trend.growthRate || 0)
              
              // Add top posts using this audio
              if (trend.topPosts) {
                audio.topPosts.push(...trend.topPosts.slice(0, 2))
              }
            }
          }
        }
        
        // Add delay between niches
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (error) {
        console.error(`Error collecting audio trends for ${niche}:`, error)
      }
    }
    
    // Sort by usage count and return top trending audio
    const sortedAudio = Array.from(audioMap.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 20) // Top 20 trending audio tracks
    
    // Save to database
    await this.saveAudioTrends(sortedAudio)
    
    return sortedAudio
  }
  
  /**
   * Parse audio name into artist and track
   */
  private parseAudioName(audioName: string): [string, string] {
    const parts = audioName.split(' - ')
    if (parts.length === 2) {
      return [parts[0].trim(), parts[1].trim()]
    }
    return ['Unknown Artist', audioName]
  }
  
  /**
   * Save audio trends to database
   */
  private async saveAudioTrends(audioTrends: AudioTrend[]): Promise<void> {
    const supabase = getSupabaseAdmin()
    
    for (const audio of audioTrends) {
      try {
        await supabase.from('audio_trends').upsert({
          track_key: `${audio.artist}-${audio.track}`.toLowerCase(),
          artist: audio.artist,
          track: audio.track,
          usage_count: audio.usageCount,
          niches: audio.niches,
          avg_engagement: audio.avgEngagement,
          growth_rate: audio.growthRate,
          top_posts: audio.topPosts.slice(0, 5), // Keep top 5 posts
          last_updated: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error saving audio trend:', error)
      }
    }
  }
  
  /**
   * Get trending audio for a specific niche
   */
  async getTrendingAudioForNiche(niche: string): Promise<AudioTrend[]> {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase
      .from('audio_trends')
      .select('*')
      .contains('niches', [niche])
      .order('usage_count', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching audio trends:', error)
      return []
    }
    
    return (data as any) || []
  }
}