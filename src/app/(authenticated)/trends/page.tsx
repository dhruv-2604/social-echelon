'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Clock, 
  Zap, 
  RefreshCw, 
  ArrowRight,
  Flower2,
  Leaf,
  Sun,
  Cloud,
  Wind,
  TreePine,
  TrendingUp
} from 'lucide-react'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

interface XTrend {
  query: string
  trending_score: number
  avg_engagement: number
  top_tweets: any[]
  content_insights: {
    avg_length: number
    common_formats: string[]
    viral_elements: string[]
  }
}

interface CrossPlatformInsights {
  hot_topics: Array<{
    topic: string
    instagram_potential: string
    suggested_content: string[]
  }>
  cross_platform_tips: string[]
  timing_insight: string
  viral_topics?: Array<{
    topic: string
    instagram_strategy: string
    content_ideas: string[]
  }>
  best_hooks?: string[]
  trending_formats?: string[]
  adaptation_tips?: string[]
}

export default function TrendGardenPage() {
  const [xTrends, setXTrends] = useState<XTrend[]>([])
  const [insights, setInsights] = useState<CrossPlatformInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [niche, setNiche] = useState('lifestyle')
  const [refreshing, setRefreshing] = useState(false)
  const [showAll, setShowAll] = useState(true)

  useEffect(() => {
    fetchTrends()
  }, [niche])

  const fetchTrends = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/trends/x-twitter?niche=${niche}`)
      const data = await response.json()
      
      if (data.success) {
        setXTrends(data.trends)
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Error fetching trends:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchTrends()
  }

  const getTrendStatus = (score: number) => {
    if (score > 80) return { label: `${score}% Hot`, icon: Zap, color: 'text-red-600 bg-red-50' }
    if (score > 50) return { label: `${score}% Trending`, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' }
    return { label: `${score}% Growing`, icon: Sparkles, color: 'text-blue-600 bg-blue-50' }
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
            <Flower2 className="w-8 h-8 text-purple-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-600">Cultivating trends...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light text-gray-800 mb-4">
            Trend Garden
          </h1>
          <p className="text-gray-600 text-lg">
            Watch ideas bloom naturally
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
            <label className="text-sm text-gray-600">Your Niche:</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 focus:border-purple-400 focus:outline-none"
            >
              <option value="lifestyle">Lifestyle</option>
              <option value="fashion">Fashion</option>
              <option value="fitness">Fitness</option>
              <option value="beauty">Beauty</option>
              <option value="food">Food</option>
              <option value="travel">Travel</option>
              <option value="tech">Tech</option>
              <option value="business">Business</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-gray-200 hover:bg-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-gray-700">Refresh</span>
          </button>
        </motion.div>


        {/* Insights Garden */}
        {insights?.hot_topics && insights.hot_topics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-10"
          >
            <WellnessCard className="bg-gradient-to-br from-green-50 to-blue-50">
              <div className="flex items-start gap-4">
                <Sun className="w-6 h-6 text-amber-500 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-medium text-gray-800 mb-3">Today's Harvest</h3>
                  <p className="text-gray-600 mb-6">{insights.timing_insight}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.hot_topics.slice(0, 3).map((topic, idx) => (
                      <motion.div 
                        key={idx} 
                        className="bg-white/80 rounded-lg p-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-800">{topic.topic}</span>
                          <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="space-y-2">
                          {topic.suggested_content.slice(0, 2).map((suggestion, sIdx) => (
                            <p key={sIdx} className="text-sm text-gray-600">
                              • {suggestion}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </WellnessCard>
          </motion.div>
        )}

        {/* Trending Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {xTrends.map((trend, idx) => {
              const status = getTrendStatus(trend.trending_score)
              const StatusIcon = status.icon
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                >
                  <WellnessCard hover>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-800">{trend.query}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {status.label}
                      </span>
                    </div>
                    
                    {/* Trend Metrics */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-light text-gray-800">
                          {(trend.avg_engagement / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-gray-500">Avg Engagement</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-light text-gray-800">
                          {trend.trending_score}%
                        </div>
                        <div className="text-xs text-gray-500">Trending Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-light text-gray-800">
                          {trend.top_tweets.length}
                        </div>
                        <div className="text-xs text-gray-500">Top Posts</div>
                      </div>
                    </div>

                    {/* Success Factors */}
                    {trend.content_insights.viral_elements.length > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">What's Working:</p>
                        <div className="space-y-1">
                          {trend.content_insights.viral_elements.slice(0, 2).map((element, eIdx) => (
                            <p key={eIdx} className="text-sm text-gray-600 flex items-center gap-2">
                              <Leaf className="w-3 h-3 text-green-500" />
                              {element}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Tweet Example */}
                    {trend.top_tweets.length > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-700 mb-1">Top performing example:</p>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {trend.top_tweets[0].content}
                        </p>
                      </div>
                    )}
                  </WellnessCard>
                </motion.div>
              )
            })}
        </div>

        {/* Cultivation Tips */}
        {insights?.cross_platform_tips && insights.cross_platform_tips.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <WellnessCard className="bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-xl font-medium text-gray-800 mb-4">
                <Cloud className="w-5 h-5 inline mr-2 text-purple-500" />
                Cultivation Wisdom
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.cross_platform_tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Wind className="w-4 h-4 text-purple-400 mt-1" />
                    <span className="text-gray-700 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </WellnessCard>
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
          Your garden refreshes naturally throughout the day
        </motion.div>
      </div>
    </div>
  )
}