'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Hash, Clock, Zap } from 'lucide-react'

interface Trend {
  id: string
  type: string
  name: string
  confidence: number
  phase: string
  growth: number
  engagement: number
  saturation: number
  related: string[]
  optimal_times: number[]
}

interface TrendSummary {
  hot_topics: string[]
  best_posting_times: number[]
  content_format_mix: { [key: string]: number }
  avg_engagement_rate: number
}

export default function TrendsPage() {
  const [selectedNiche, setSelectedNiche] = useState('lifestyle')
  const [trends, setTrends] = useState<Trend[]>([])
  const [summary, setSummary] = useState<TrendSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const niches = [
    'fitness', 'beauty', 'lifestyle', 'fashion', 'food', 
    'travel', 'business', 'parenting', 'tech', 'education'
  ]

  const fetchTrends = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/trends/${selectedNiche}?minConfidence=50`)
      const data = await response.json()
      
      if (data.success) {
        setTrends(data.trends)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching trends:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [selectedNiche])

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'emerging': return 'text-green-600 bg-green-100'
      case 'growing': return 'text-blue-600 bg-blue-100'
      case 'peak': return 'text-purple-600 bg-purple-100'
      case 'declining': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 50) return '🚀'
    if (growth > 20) return '📈'
    if (growth > -20) return '➡️'
    return '📉'
  }

  // Test trend collection
  const testCollection = async () => {
    setLoading(true)
    try {
      console.log(`Starting collection for ${selectedNiche}...`)
      const response = await fetch(`/api/trends/collect?test=true&niche=${selectedNiche}`)
      const data = await response.json()
      console.log('Test collection result:', data)
      
      // Wait a moment for database write
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Refresh trends after collection
      await fetchTrends()
    } catch (error) {
      console.error('Error testing collection:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trend Monitoring Dashboard</h1>
          <p className="text-gray-800">Real-time trend analysis for content creation</p>
        </div>

        {/* Niche Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Select Niche</h2>
            <button
              onClick={testCollection}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-lg transition-colors ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {loading ? 'Collecting...' : 'Test Collection'}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {niches.map(niche => (
              <button
                key={niche}
                onClick={() => setSelectedNiche(niche)}
                className={`p-3 rounded-lg border capitalize transition-all ${
                  selectedNiche === niche
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {niche}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-800 font-medium">Hot Topics</span>
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.hot_topics.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-800 font-medium">Avg Engagement</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.avg_engagement_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-800 font-medium">Best Times</span>
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {summary.best_posting_times.map(t => `${t}:00`).join(', ')}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-800 font-medium">Total Trends</span>
                <Hash className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{trends.length}</p>
            </div>
          </div>
        )}

        {/* Trends Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Active Trends</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-4 text-gray-800">Loading trends...</p>
            </div>
          ) : trends.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <th className="px-6 py-3">Trend</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Phase</th>
                    <th className="px-6 py-3">Growth</th>
                    <th className="px-6 py-3">Confidence</th>
                    <th className="px-6 py-3">Engagement</th>
                    <th className="px-6 py-3">Saturation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trends.map((trend) => (
                    <tr key={trend.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{trend.name}</div>
                        {trend.related.length > 0 && (
                          <div className="text-xs text-gray-700">
                            Related: {trend.related.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {trend.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPhaseColor(trend.phase)}`}>
                          {trend.phase}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getGrowthIcon(trend.growth)}</span>
                          <span className={trend.growth > 0 ? 'text-green-600' : 'text-red-600'}>
                            {trend.growth > 0 ? '+' : ''}{trend.growth}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${trend.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-800 font-medium">{trend.confidence}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.engagement.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              trend.saturation > 70 ? 'bg-red-500' : 
                              trend.saturation > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${trend.saturation}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-800 font-medium">{trend.saturation}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Hash className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No trends found for {selectedNiche}</p>
              <p className="text-sm mt-2">Click "Test Collection" to generate sample trends</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}