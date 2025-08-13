'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Zap, Twitter, RefreshCw, ArrowRight } from 'lucide-react'

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

interface TikTokTrend {
  topic: string
  viral_score: number
  videos: any[]
  content_patterns: {
    hooks: string[]
    formats: string[]
    sounds: string[]
  }
  instagram_potential: string
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

export default function TrendsPage() {
  const [xTrends, setXTrends] = useState<XTrend[]>([])
  const [insights, setInsights] = useState<CrossPlatformInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [niche, setNiche] = useState('lifestyle')
  const [refreshing, setRefreshing] = useState(false)

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

  const getTrendColor = (score: number) => {
    if (score > 80) return 'text-red-600 bg-red-100'
    if (score > 50) return 'text-orange-600 bg-orange-100'
    return 'text-blue-600 bg-blue-100'
  }

  if (loading && !refreshing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Twitter className="w-8 h-8 text-blue-400" />
            X Trends for Instagram
          </h1>
          <p className="text-gray-600 mt-2">
            Discover what's trending on X and adapt it for Instagram success
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Hot Topics Alert */}
      {insights?.hot_topics && insights.hot_topics.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <Zap className="w-6 h-6 text-red-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">🔥 Hot Topics Alert</h3>
              <p className="text-red-800 mb-4">{insights.timing_insight}</p>
              <div className="space-y-3">
                {insights.hot_topics.slice(0, 3).map((topic, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{topic.topic}</span>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        topic.instagram_potential.includes('High') ? 'bg-red-100 text-red-700' :
                        topic.instagram_potential.includes('Medium') ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {topic.instagram_potential}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {topic.suggested_content.map((suggestion, sIdx) => (
                        <p key={sIdx} className="text-sm text-gray-600 flex items-start gap-2">
                          <ArrowRight className="w-4 h-4 text-gray-400 mt-0.5" />
                          {suggestion}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trending Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {xTrends.map((trend, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{trend.query}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrendColor(trend.trending_score)}`}>
                {trend.trending_score}% Hot
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {(trend.avg_engagement / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-gray-500">Avg Engagement</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {trend.content_insights.avg_length}
                </div>
                <div className="text-xs text-gray-500">Avg Length</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {trend.top_tweets.length}
                </div>
                <div className="text-xs text-gray-500">Top Posts</div>
              </div>
            </div>

            {/* Content Insights */}
            {trend.content_insights.common_formats.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">What's Working:</p>
                <div className="flex flex-wrap gap-2">
                  {trend.content_insights.common_formats.map((format, fIdx) => (
                    <span key={fIdx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Viral Elements */}
            {trend.content_insights.viral_elements.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Success Factors:</p>
                <ul className="space-y-1">
                  {trend.content_insights.viral_elements.map((element, eIdx) => (
                    <li key={eIdx} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      {element}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Tweets */}
            {trend.top_tweets.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Top Tweet:</p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-800 line-clamp-3">{trend.top_tweets[0].content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>{trend.top_tweets[0].username}</span>
                    <span>❤️ {trend.top_tweets[0].likes}</span>
                    <span>🔁 {trend.top_tweets[0].reposts}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cross-Platform Tips */}
      {insights?.cross_platform_tips && insights.cross_platform_tips.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">💡 Instagram Adaptation Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.cross_platform_tips.map((tip, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <Clock className="w-4 h-4 inline-block mr-1" />
        Trends update in real-time. Data sourced from X (Twitter) public posts.
      </div>
    </div>
  )
}