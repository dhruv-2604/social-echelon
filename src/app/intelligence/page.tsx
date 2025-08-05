'use client'

import { useEffect, useState } from 'react'
import { Brain, TrendingUp, Hash, Clock, Sparkles, Users, BookOpen } from 'lucide-react'

interface UserInsights {
  best_caption_length?: number[]
  best_hashtag_count?: number
  best_posting_hour?: number
  best_day_of_week?: number
  best_content_format?: string
  avg_reach?: number
  avg_engagement_rate?: number
  top_10_percent_reach?: number
}

interface ContentPattern {
  pattern_type: string
  pattern_description: string
  avg_performance_score: number
  success_rate: number
  confidence_score: number
  sample_size: number
}

export default function IntelligencePage() {
  const [insights, setInsights] = useState<UserInsights | null>(null)
  const [patterns, setPatterns] = useState<ContentPattern[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchInsights()
  }, [])

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/intelligence/analyze')
      if (!response.ok) throw new Error('Failed to fetch insights')
      const data = await response.json()
      setInsights(data.personal_insights)
      setPatterns(data.top_patterns || [])
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      console.log('Starting content analysis...')
      const response = await fetch('/api/intelligence/analyze', { method: 'POST' })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Analysis failed:', errorData)
        alert(`Analysis failed: ${errorData.error || 'Unknown error'}`)
        throw new Error(errorData.error || 'Failed to analyze content')
      }
      
      const result = await response.json()
      console.log('Analysis result:', result)
      
      // Show success message
      alert('Content analysis completed successfully! Refreshing insights...')
      
      // Refresh insights
      await fetchInsights()
    } catch (error) {
      console.error('Error analyzing content:', error)
      alert('Failed to analyze content. Check console for details.')
    } finally {
      setAnalyzing(false)
    }
  }

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'caption_length': return <BookOpen className="w-5 h-5" />
      case 'hashtag_count': return <Hash className="w-5 h-5" />
      case 'posting_time': return <Clock className="w-5 h-5" />
      case 'content_format': return <Sparkles className="w-5 h-5" />
      default: return <TrendingUp className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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
            <Brain className="w-8 h-8 text-purple-600" />
            Content Intelligence
          </h1>
          <p className="text-gray-600 mt-2">
            AI-powered insights from your content performance
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {analyzing ? 'Analyzing...' : 'Analyze My Content'}
        </button>
      </div>

      {/* Personal Insights */}
      {insights ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {insights.best_caption_length && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold">Optimal Caption Length</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  // Parse PostgreSQL range format "[85,128)" or handle array
                  if (typeof insights.best_caption_length === 'string') {
                    const match = insights.best_caption_length.content && post.content.match(/\[(\d+),(\d+)\)/)
                    if (match) {
                      return `${match[1]}-${match[2]}`
                    }
                  } else if (Array.isArray(insights.best_caption_length)) {
                    return `${insights.best_caption_length[0]}-${insights.best_caption_length[1]}`
                  }
                  return '0-300'
                })()}
              </p>
              <p className="text-sm text-gray-600 mt-1">characters</p>
            </div>
          )}

          {insights.best_hashtag_count !== undefined && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <Hash className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold">Best Hashtag Count</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {insights.best_hashtag_count}
              </p>
              <p className="text-sm text-gray-600 mt-1">hashtags per post</p>
            </div>
          )}

          {insights.best_posting_hour !== undefined && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold">Best Posting Time</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {insights.best_posting_hour}:00
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {insights.best_posting_hour >= 12 ? 'PM' : 'AM'}
              </p>
            </div>
          )}

          {insights.best_content_format && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-6 h-6 text-orange-600" />
                <h3 className="font-semibold">Top Format</h3>
              </div>
              <p className="text-2xl font-bold text-orange-600 capitalize">
                {insights.best_content_format}
              </p>
              <p className="text-sm text-gray-600 mt-1">highest reach</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-12">
          <p className="text-yellow-800">
            No insights available yet. Click "Analyze My Content" to generate personalized insights.
          </p>
        </div>
      )}

      {/* Discovered Patterns */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Discovered Success Patterns</h2>
        
        {patterns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {patterns.map((pattern, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getPatternIcon(pattern.pattern_type)}
                    <div>
                      <h3 className="font-semibold capitalize">
                        {pattern.pattern_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {pattern.pattern_description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {pattern.avg_performance_score.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">avg score</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {pattern.success_rate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">success rate</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {pattern.confidence_score}%
                    </div>
                    <div className="text-xs text-gray-500">confidence</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {pattern.sample_size}
                    </div>
                    <div className="text-xs text-gray-500">samples</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No patterns discovered yet. We need more data from users to identify success patterns.
            </p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-12 bg-purple-50 rounded-lg p-8">
        <h3 className="text-xl font-semibold mb-4">How Content Intelligence Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="font-medium mb-2">Analyze Your Content</h4>
            <p className="text-sm text-gray-600">
              We analyze your posts' captions, hashtags, timing, and performance metrics
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="font-medium mb-2">Detect Patterns</h4>
            <p className="text-sm text-gray-600">
              Our AI identifies what makes your content successful compared to others
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="font-medium mb-2">Optimize Future Content</h4>
            <p className="text-sm text-gray-600">
              Your content suggestions are automatically optimized based on these insights
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}