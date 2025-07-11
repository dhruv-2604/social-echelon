'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, TrendingUp, TrendingDown, Clock, Users, Activity } from 'lucide-react'

interface AlgorithmStatus {
  status: 'stable' | 'monitoring' | 'changing' | 'critical'
  message: string
  active_changes: number
  last_check: string
  recommendations: string[]
  changes: any[]
  insights: Record<string, any>
}

export default function AlgorithmInsightsPage() {
  const [status, setStatus] = useState<AlgorithmStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAlgorithmStatus()
    const interval = setInterval(fetchAlgorithmStatus, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchAlgorithmStatus = async () => {
    try {
      const response = await fetch('/api/algorithm/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError('Failed to load algorithm status')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'text-green-600 bg-green-100'
      case 'monitoring': return 'text-yellow-600 bg-yellow-100'
      case 'changing': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stable': return <Activity className="w-5 h-5" />
      case 'monitoring': return <Clock className="w-5 h-5" />
      case 'changing': return <TrendingUp className="w-5 h-5" />
      case 'critical': return <AlertCircle className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Instagram Algorithm Insights</h1>

      {/* Status Banner */}
      <div className={`rounded-lg p-6 mb-8 ${getStatusColor(status.status).split(' ')[1]}`}>
        <div className="flex items-center gap-3">
          <div className={`${getStatusColor(status.status).split(' ')[0]}`}>
            {getStatusIcon(status.status)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{status.message}</h2>
            <p className="text-sm opacity-75">
              Last checked: {new Date(status.last_check).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Changes</div>
          <div className="text-2xl font-bold">{status.active_changes}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Affected Users</div>
          <div className="text-2xl font-bold">
            {status.changes.reduce((sum, c) => sum + c.affected_users, 0)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Avg Confidence</div>
          <div className="text-2xl font-bold">
            {status.changes.length > 0 
              ? Math.round(status.changes.reduce((sum, c) => sum + c.confidence, 0) / status.changes.length) 
              : 0}%
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">
            Recommended Actions
          </h3>
          <ul className="space-y-2">
            {status.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span className="text-blue-800">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Changes */}
      {status.changes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Active Algorithm Changes</h3>
          <div className="space-y-4">
            {status.changes.map((change) => (
              <div key={change.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        change.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        change.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {change.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(change.detected_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-semibold capitalize">
                      {change.type.replace(/_/g, ' ')}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {change.metric} changed by {change.change_percentage > 0 ? '+' : ''}{change.change_percentage.toFixed(1)}%
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {change.affected_users} users affected
                      </span>
                      <span>
                        Confidence: {change.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className={`text-2xl ${
                    change.change_percentage > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.change_percentage > 0 ? <TrendingUp /> : <TrendingDown />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Niche Insights */}
      {Object.keys(status.insights).length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Insights by Niche</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(status.insights).map(([niche, insights]: [string, any]) => (
              <div key={niche} className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold capitalize mb-3">{niche}</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Best Format:</span>
                    <span className="ml-2 font-medium">{insights.best_content_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Best Times:</span>
                    <span className="ml-2 font-medium">
                      {insights.optimal_times?.map((t: number) => `${t}:00`).join(', ')}
                    </span>
                  </div>
                  {insights.trending_hashtags?.length > 0 && (
                    <div>
                      <span className="text-gray-600">Trending:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {insights.trending_hashtags.map((tag: string) => (
                          <span key={tag} className="bg-gray-100 px-2 py-1 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}