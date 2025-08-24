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
  AlertCircle
} from 'lucide-react'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

interface InstagramTrend {
  id: string
  trend_name: string
  trend_type: string
  platform: string
  metrics: {
    hashtag: string
    postCount: number
    avgEngagement: number
    totalEngagement: number
    growthRate: number
    trendingAudio?: Array<[string, number]>
    topPosts?: Array<{
      url: string
      likes: number
      comments: number
      caption: string
      createdAt: string
    }>
  }
  collected_at: string
}

interface TrendInsights {
  totalTrends: number
  avgGrowthRate: number
  topAudio: Array<[string, number]>
  bestPostingTime: string
  dominantContentType: string
}

export default function TrendGardenPage() {
  const [trends, setTrends] = useState<InstagramTrend[]>([])
  const [insights, setInsights] = useState<TrendInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [niche, setNiche] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTrend, setSelectedTrend] = useState<InstagramTrend | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInstagramTrends()
  }, [niche])

  const fetchInstagramTrends = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch Instagram trends from our database
      const response = await fetch('/api/trends/instagram', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch trends')
      }
      
      const data = await response.json()
      
      if (data.success && data.trends) {
        setTrends(data.trends)
        
        // Calculate insights from the trends
        const insights = calculateInsights(data.trends)
        setInsights(insights)
      } else {
        setError('No trend data available. Trends are collected daily at 9 AM.')
      }
    } catch (error) {
      console.error('Error fetching Instagram trends:', error)
      setError('Failed to load trends. Please try again later.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateInsights = (trends: InstagramTrend[]): TrendInsights => {
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
          fetchInstagramTrends()
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
    if (growthRate > 10) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (growthRate < -10) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <TrendingUp className="w-4 h-4 text-gray-400" />
  }

  const formatEngagement = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-600">Gathering Instagram trends...</p>
        </motion.div>
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
            Instagram Trend Garden
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time insights from Instagram's trending content
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div 
          className="flex justify-center items-center gap-6 mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
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
            <WellnessCard className="bg-gradient-to-br from-purple-50 to-pink-50">
              <h3 className="text-xl font-medium text-gray-800 mb-6">Trend Insights</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Trends */}
                <div className="text-center">
                  <Hash className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-light text-gray-800">{insights.totalTrends}</div>
                  <div className="text-sm text-gray-600">Active Trends</div>
                </div>

                {/* Average Growth */}
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-light text-gray-800">
                    {insights.avgGrowthRate > 0 ? '+' : ''}{insights.avgGrowthRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Growth Rate</div>
                </div>

                {/* Top Audio */}
                <div className="text-center">
                  <Music className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                  <div className="text-2xl font-light text-gray-800">{insights.topAudio.length}</div>
                  <div className="text-sm text-gray-600">Trending Sounds</div>
                </div>

                {/* Best Time */}
                <div className="text-center">
                  <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-lg font-light text-gray-800">{insights.bestPostingTime}</div>
                  <div className="text-sm text-gray-600">Best Posting Time</div>
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

        {/* Trending Hashtags Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trends.map((trend, idx) => (
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
                      <Hash className="w-4 h-4 text-purple-400" />
                      {trend.metrics.hashtag || trend.trend_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {trend.metrics.postCount} posts analyzed
                    </p>
                  </div>
                  {getGrowthIcon(trend.metrics.growthRate)}
                </div>
                
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xl font-light text-gray-800">
                      {formatEngagement(trend.metrics.avgEngagement)}
                    </div>
                    <div className="text-xs text-gray-500">Avg Engagement</div>
                  </div>
                  <div>
                    <div className="text-xl font-light text-gray-800">
                      {trend.metrics.growthRate > 0 ? '+' : ''}{trend.metrics.growthRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Growth Rate</div>
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
        {trends.length === 0 && !loading && !error && (
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
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-light text-gray-800 mb-4">
                #{selectedTrend.metrics.hashtag || selectedTrend.trend_name}
              </h2>
              
              {/* Top Posts */}
              {selectedTrend.metrics.topPosts && selectedTrend.metrics.topPosts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Top Performing Posts</h3>
                  <div className="space-y-3">
                    {selectedTrend.metrics.topPosts.slice(0, 3).map((post, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                          {post.caption}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {formatEngagement(post.likes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {formatEngagement(post.comments)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Audio */}
              {selectedTrend.metrics.trendingAudio && selectedTrend.metrics.trendingAudio.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Trending Audio</h3>
                  <div className="space-y-2">
                    {selectedTrend.metrics.trendingAudio.slice(0, 5).map(([audio, count], idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                        <span className="text-sm text-gray-700">{audio}</span>
                        <span className="text-xs text-gray-500">{count} uses</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedTrend(null)}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}