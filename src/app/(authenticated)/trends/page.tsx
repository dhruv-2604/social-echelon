'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Clock, 
  Zap, 
  RefreshCw, 
  Music,
  Hash,
  TrendingUp,
  TrendingDown,
  Heart,
  MessageCircle,
  Play,
  Calendar,
  AlertCircle,
  Twitter,
  Instagram,
  Globe
} from 'lucide-react'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

interface Trend {
  id: string
  trend_name: string
  trend_type: string
  platform: 'instagram' | 'twitter'
  niche: string
  metrics: {
    hashtag?: string
    postCount?: number
    tweetCount?: number
    avgEngagement: number
    totalEngagement: number
    growthRate: number
    trendingAudio?: Array<[string, number]>
    trendingTopics?: Array<[string, number]>
    topPosts?: Array<{
      url: string
      likes: number
      comments: number
      caption?: string
      text?: string
      createdAt: string
    }>
    topTweets?: Array<{
      text: string
      like_count: number
      retweet_count: number
      user: { username: string }
      url: string
    }>
  }
  confidence_score: number
  collected_at: string
}

interface CrossPlatformTrend {
  trend_name: string
  niche: string
  instagram_score: number | null
  twitter_score: number | null
  combined_score: number
  trending_both: boolean
  instagram_growth: number | null
  twitter_growth: number | null
  recommendation: string
  predicted_virality: number
  best_time_to_post: string
}

interface TrendInsights {
  totalTrends: number
  avgGrowthRate: number
  topAudio: Array<[string, number]>
  bestPostingTime: string
  dominantContentType: string
}

export default function TrendGardenPage() {
  const [instagramTrends, setInstagramTrends] = useState<Trend[]>([])
  const [twitterTrends, setTwitterTrends] = useState<Trend[]>([])
  const [crossPlatformTrends, setCrossPlatformTrends] = useState<CrossPlatformTrend[]>([])
  const [insights, setInsights] = useState<TrendInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [niche, setNiche] = useState('all')
  const [platform, setPlatform] = useState<'all' | 'instagram' | 'twitter'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllTrends()
  }, [niche, platform])

  const fetchAllTrends = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all trends based on platform selection
      const promises = []
      
      if (platform === 'all' || platform === 'instagram') {
        promises.push(
          fetch('/api/trends/instagram', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }
      
      if (platform === 'all' || platform === 'twitter') {
        promises.push(
          fetch('/api/trends/twitter', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          })
        )
      }
      
      // Always fetch cross-platform analysis
      promises.push(
        fetch(`/api/trends/cross-platform${niche !== 'all' ? `?niche=${niche}` : ''}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      const responses = await Promise.all(promises)
      
      let igTrends: Trend[] = []
      let twTrends: Trend[] = []
      let crossTrends: CrossPlatformTrend[] = []
      
      let responseIndex = 0
      if (platform === 'all' || platform === 'instagram') {
        const igData = await responses[responseIndex++].json()
        if (igData.success && igData.trends) {
          igTrends = igData.trends
        }
      }
      
      if (platform === 'all' || platform === 'twitter') {
        const twData = await responses[responseIndex++].json()
        if (twData.success && twData.trends) {
          twTrends = twData.trends
        }
      }
      
      const crossData = await responses[responses.length - 1].json()
      if (crossData.trends) {
        crossTrends = crossData.trends
      }
      
      setInstagramTrends(igTrends)
      setTwitterTrends(twTrends)
      setCrossPlatformTrends(crossTrends)
      
      // Calculate insights from all trends
      const allTrends = [...igTrends, ...twTrends]
      const insights = calculateInsights(allTrends)
      setInsights(insights)
    } catch (error) {
      console.error('Error fetching Instagram trends:', error)
      setError('Failed to load trends. Please try again later.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateInsights = (trends: Trend[]): TrendInsights => {
    // Aggregate all audio trends
    const audioMap = new Map<string, number>()
    let totalGrowth = 0
    let trendCount = 0
    
    trends.forEach(trend => {
      if (trend.metrics.growthRate) {
        totalGrowth += trend.metrics.growthRate
        trendCount++
      }
      
      // Aggregate audio
      if (trend.metrics.trendingAudio) {
        trend.metrics.trendingAudio.forEach(([audio, count]) => {
          audioMap.set(audio, (audioMap.get(audio) || 0) + count)
        })
      }
    })
    
    // Sort audio by usage
    const topAudio = Array.from(audioMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    
    return {
      totalTrends: trends.length,
      avgGrowthRate: trendCount > 0 ? totalGrowth / trendCount : 0,
      topAudio,
      bestPostingTime: '7 PM - 9 PM', // This could be calculated from data
      dominantContentType: 'Reels' // This could be determined from metrics
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    
    // Trigger new collection
    try {
      const hashtagsToCollect = getHashtagsForNiche(niche)
      console.log(`Collecting trends for ${niche} with hashtags:`, hashtagsToCollect)
      
      const response = await fetch('/api/trends/instagram', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashtags: hashtagsToCollect,
          maxPostsPerTag: 100,
          analysisType: 'quick'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Collection successful:', data)
        
        // Wait a bit then fetch the new data
        setTimeout(() => {
          fetchAllTrends()
          setRefreshing(false)
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error('Collection failed:', errorData)
        setError(errorData.error || 'Failed to collect trends')
        setRefreshing(false)
      }
    } catch (error) {
      console.error('Error triggering collection:', error)
      setError('Network error - please try again')
      setRefreshing(false)
    }
  }

  const getHashtagsForNiche = (niche: string): string[] => {
    const hashtagMap: Record<string, string[]> = {
      fitness: ['fitness', 'workout', 'gym'],
      beauty: ['beauty', 'makeup', 'skincare'],
      lifestyle: ['lifestyle', 'dailylife', 'aesthetic'],
      fashion: ['fashion', 'ootd', 'style'],
      food: ['foodie', 'recipe', 'cooking'],
      all: ['trending', 'viral', 'explore']
    }
    return hashtagMap[niche] || ['trending']
  }

  const getGrowthIcon = (growthRate: number) => {
    if (growthRate > 5) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (growthRate < -5) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <TrendingUp className="w-4 h-4 text-gray-400" />
  }

  const getGrowthColor = (growthRate: number) => {
    if (growthRate > 5) return 'text-green-500'
    if (growthRate < -5) return 'text-red-500'
    return 'text-gray-500'
  }

  const getGrowthBgColor = (growthRate: number) => {
    if (growthRate > 5) return 'bg-green-50'
    if (growthRate < -5) return 'bg-red-50'
    return 'bg-gray-50'
  }

  const formatEngagement = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="h-10 bg-gray-200 rounded-lg w-80 mx-auto mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-lg w-96 mx-auto animate-pulse"></div>
          </motion.div>

          {/* Controls Skeleton */}
          <div className="flex justify-center items-center gap-6 mb-10">
            <div className="h-10 bg-gray-200 rounded-full w-48 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded-full w-32 animate-pulse"></div>
          </div>

          {/* Insights Overview Skeleton */}
          <div className="mb-10">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-purple-100">
              <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="text-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trending Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="h-6 bg-gray-200 rounded w-16 mx-auto mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <div className="h-3 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light text-gray-800 mb-4">
            Social Trend Garden
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time insights from Instagram and Twitter trends
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div 
          className="flex justify-center items-center gap-6 mb-10 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Platform Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Platform:</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'all' | 'instagram' | 'twitter')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 focus:border-purple-400 focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter</option>
            </select>
          </div>
          
          {/* Niche Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Filter by niche:</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 focus:border-purple-400 focus:outline-none"
            >
              <option value="all">All Niches</option>
              <option value="fitness">Fitness</option>
              <option value="beauty">Beauty</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="fashion">Fashion</option>
              <option value="food">Food</option>
            </select>
          </div>

          {/* Refresh */}
          <WellnessButton
            onClick={handleRefresh}
            disabled={refreshing}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Collecting...' : 'Refresh'}
          </WellnessButton>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <WellnessCard className="bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-yellow-800">{error}</p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Trends are automatically collected daily. You can also trigger a manual collection using the refresh button.
                  </p>
                </div>
              </div>
            </WellnessCard>
          </motion.div>
        )}

        {/* Insights Overview */}
        {insights && insights.totalTrends > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-10"
          >
            <WellnessCard className="bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg border border-purple-100">
              <h3 className="text-xl font-medium text-gray-800 mb-6">Trend Insights</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Trends */}
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Hash className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="text-2xl font-medium text-purple-600">{insights.totalTrends}</div>
                  <div className="text-sm text-gray-600 font-medium">Active Trends</div>
                </div>

                {/* Average Growth */}
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    insights.avgGrowthRate > 5 ? 'bg-green-100' : 
                    insights.avgGrowthRate < -5 ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {insights.avgGrowthRate > 5 ? (
                      <TrendingUp className="w-6 h-6 text-green-500" />
                    ) : insights.avgGrowthRate < -5 ? (
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    ) : (
                      <TrendingUp className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className={`text-2xl font-medium ${
                    insights.avgGrowthRate > 5 ? 'text-green-600' : 
                    insights.avgGrowthRate < -5 ? 'text-red-600' : 'text-gray-700'
                  }`}>
                    {insights.avgGrowthRate > 0 ? '+' : ''}{insights.avgGrowthRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Avg Growth Rate</div>
                </div>

                {/* Top Audio */}
                <div className="text-center">
                  <div className="w-12 h-12 bg-pink-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Music className="w-6 h-6 text-pink-500" />
                  </div>
                  <div className="text-2xl font-medium text-pink-600">{insights.topAudio.length}</div>
                  <div className="text-sm text-gray-600 font-medium">Trending Sounds</div>
                </div>

                {/* Best Time */}
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-lg font-medium text-blue-600">{insights.bestPostingTime}</div>
                  <div className="text-sm text-gray-600 font-medium">Best Posting Time</div>
                </div>
              </div>

              {/* Trending Audio Section */}
              {insights.topAudio.length > 0 && (
                <div className="mt-8 pt-6 border-t border-purple-100">
                  <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                    <Music className="w-5 h-5 mr-2 text-pink-500" />
                    Viral Audio Trends
                  </h4>
                  <div className="space-y-3">
                    {insights.topAudio.map(([audio, count], idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white/70 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-light text-gray-400">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{audio}</p>
                            <p className="text-sm text-gray-500">Used in {count} posts</p>
                          </div>
                        </div>
                        <Play className="w-5 h-5 text-purple-400" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </WellnessCard>
          </motion.div>
        )}

        {/* Cross-Platform Hot Trends */}
        {crossPlatformTrends.filter(t => t.trending_both).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-10"
          >
            <h2 className="text-2xl font-light text-gray-800 mb-6 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Trending on Both Platforms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crossPlatformTrends
                .filter(t => t.trending_both)
                .slice(0, 6)
                .map((trend, idx) => (
                  <WellnessCard key={idx} className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-800">{trend.trend_name}</h3>
                      <div className="flex gap-1">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <Twitter className="w-4 h-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="text-center p-2 bg-white/50 rounded">
                        <div className="text-sm font-medium">{trend.instagram_score?.toFixed(0) || '-'}%</div>
                        <div className="text-xs text-gray-600">Instagram</div>
                      </div>
                      <div className="text-center p-2 bg-white/50 rounded">
                        <div className="text-sm font-medium">{trend.twitter_score?.toFixed(0) || '-'}%</div>
                        <div className="text-xs text-gray-600">Twitter</div>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700 font-medium">{trend.recommendation}</p>
                    <p className="text-xs text-gray-600 mt-2">Post: {trend.best_time_to_post}</p>
                  </WellnessCard>
                ))}
            </div>
          </motion.div>
        )}

        {/* All Trends Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...instagramTrends, ...twitterTrends].map((trend, idx) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              onClick={() => setSelectedTrend(trend)}
              className="cursor-pointer"
            >
              <WellnessCard hover className="h-full">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                      {trend.platform === 'twitter' ? (
                        <Twitter className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Instagram className="w-4 h-4 text-pink-400" />
                      )}
                      {trend.trend_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {trend.platform === 'twitter' 
                        ? `${trend.metrics.tweetCount || 0} tweets analyzed`
                        : `${trend.metrics.postCount || 0} posts analyzed`}
                    </p>
                  </div>
                  {getGrowthIcon(trend.metrics.growthRate)}
                </div>
                
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xl font-medium text-gray-800">
                      {formatEngagement(trend.metrics.avgEngagement)}
                    </div>
                    <div className="text-xs text-gray-600 font-medium mt-1">Avg Engagement</div>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${getGrowthBgColor(trend.metrics.growthRate)}`}>
                    <div className={`text-xl font-medium flex items-center justify-center gap-1 ${getGrowthColor(trend.metrics.growthRate)}`}>
                      {getGrowthIcon(trend.metrics.growthRate)}
                      {trend.metrics.growthRate > 0 ? '+' : ''}{trend.metrics.growthRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 font-medium mt-1">Growth Rate</div>
                  </div>
                </div>

                {/* Trending Audio for this hashtag */}
                {trend.metrics.trendingAudio && trend.metrics.trendingAudio.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-600 mb-2 flex items-center">
                      <Music className="w-3 h-3 mr-1" />
                      Top Audio
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {trend.metrics.trendingAudio[0][0]}
                    </p>
                  </div>
                )}

                {/* Collection Time */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Updated {new Date(trend.collected_at).toLocaleDateString()}
                  </p>
                </div>
              </WellnessCard>
            </motion.div>
          ))}
        </div>

        {/* No Data State */}
        {instagramTrends.length === 0 && twitterTrends.length === 0 && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Hash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No trend data available yet</p>
            <p className="text-gray-500">
              Trends are collected automatically every day at 9 AM.
            </p>
            <WellnessButton
              onClick={handleRefresh}
              variant="primary"
              className="mt-6"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin inline" />
                  Collecting...
                </>
              ) : (
                'Collect Trends Now'
              )}
            </WellnessButton>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div 
          className="mt-12 text-center text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Clock className="w-4 h-4 inline-block mr-1" />
          Trends are automatically collected daily at 9 AM EST
        </motion.div>
      </div>

      {/* Trend Detail Modal */}
      <AnimatePresence>
        {selectedTrend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTrend(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-medium text-gray-800 mb-2">
                    #{selectedTrend.metrics.hashtag || selectedTrend.trend_name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{selectedTrend.metrics.postCount} posts analyzed</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">Updated {new Date(selectedTrend.collected_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-medium text-gray-800">
                    {formatEngagement(selectedTrend.metrics.avgEngagement)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg Engagement</div>
                </div>
                <div className={`text-center p-4 rounded-xl ${getGrowthBgColor(selectedTrend.metrics.growthRate)}`}>
                  <div className={`text-2xl font-medium flex items-center justify-center gap-1 ${getGrowthColor(selectedTrend.metrics.growthRate)}`}>
                    {getGrowthIcon(selectedTrend.metrics.growthRate)}
                    {selectedTrend.metrics.growthRate > 0 ? '+' : ''}{selectedTrend.metrics.growthRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Growth Rate</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-medium text-purple-600">
                    {selectedTrend.metrics.postCount}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Posts</div>
                </div>
              </div>
              
              {/* Top Posts */}
              {selectedTrend.metrics.topPosts && selectedTrend.metrics.topPosts.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    Top Performing Posts
                  </h3>
                  <div className="space-y-4">
                    {selectedTrend.metrics.topPosts.slice(0, 3).map((post, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl border border-gray-100">
                        <p className="text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                          {post.caption}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <span className="flex items-center gap-2 text-gray-600">
                              <Heart className="w-4 h-4 text-red-400" />
                              <span className="font-medium">{formatEngagement(post.likes)}</span>
                            </span>
                            <span className="flex items-center gap-2 text-gray-600">
                              <MessageCircle className="w-4 h-4 text-blue-400" />
                              <span className="font-medium">{formatEngagement(post.comments)}</span>
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Audio */}
              {selectedTrend.metrics.trendingAudio && selectedTrend.metrics.trendingAudio.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <Music className="w-5 h-5 text-pink-500" />
                    Trending Audio
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedTrend.metrics.trendingAudio.slice(0, 5).map(([audio, count], idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-medium text-purple-600">#{idx + 1}</span>
                          <span className="text-gray-700 font-medium">{audio}</span>
                        </div>
                        <span className="bg-white px-3 py-1 rounded-full text-sm text-gray-600 border">
                          {count} uses
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-center pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedTrend(null)}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}