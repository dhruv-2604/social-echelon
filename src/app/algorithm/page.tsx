'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, TrendingDown, TrendingUp, Users, Activity, ChevronRight, RefreshCw } from 'lucide-react'

interface AlgorithmChange {
  id: string
  change_type: string
  metric_name: string
  before_value: number
  after_value: number
  percent_change: number
  affected_users_count: number
  sample_size: number
  confidence_score: number
  niches_affected: string[]
  recommendations: string[]
  status: string
  detected_at: string
  confirmed_at?: string
}

export default function AlgorithmPage() {
  const [changes, setChanges] = useState<AlgorithmChange[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    fetchChanges()
  }, [])

  const fetchChanges = async () => {
    try {
      const response = await fetch('/api/algorithm/history')
      const data = await response.json()
      console.log('Algorithm history response:', data)
      
      // Try both possible fields
      const changesData = data.changes || data.recent_changes || []
      console.log('Changes data:', changesData)
      setChanges(changesData)
    } catch (error) {
      console.error('Error fetching algorithm changes:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/algorithm/detect?test=true')
      const data = await response.json()
      setTestResult(data)
      
      // Refresh the changes list after test
      if (data.changes_detected > 0) {
        setTimeout(() => {
          fetchChanges()
        }, 1000) // Give the database a moment to save
      }
    } catch (error) {
      console.error('Error running test:', error)
      setTestResult({ error: 'Failed to run test' })
    } finally {
      setTesting(false)
    }
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'reach_drop':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case 'reach_increase':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'engagement_shift':
        return <Activity className="w-5 h-5 text-blue-600" />
      case 'format_preference':
        return <ChevronRight className="w-5 h-5 text-purple-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      detected: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      false_positive: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.detected}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="space-y-4">
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
            <AlertCircle className="w-8 h-8 text-purple-600" />
            Algorithm Detection
          </h1>
          <p className="text-gray-600 mt-2">
            Crowdsourced Instagram algorithm intelligence
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={testing}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Running Test...' : 'Run Detection Test'}
        </button>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`mb-8 p-6 rounded-lg ${testResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <h3 className="font-semibold mb-2">Test Results</h3>
          {testResult.error ? (
            <p className="text-red-800">{testResult.error}</p>
          ) : (
            <div>
              <p className="text-green-800">
                Detection complete: {testResult.changes_detected} algorithm changes found
              </p>
              {testResult.changes_detected > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  Changes have been saved to the database
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent Algorithm Changes */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Recent Algorithm Changes</h2>
        
        {changes.length > 0 ? (
          <div className="space-y-6">
            {changes.map((change) => (
              <div key={change.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getChangeIcon(change.change_type)}
                    <div>
                      <h3 className="font-semibold capitalize">
                        {change.change_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {change.metric_name.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(change.status)}
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {change.percent_change > 0 ? '+' : ''}{change.percent_change}%
                      </div>
                      <div className="text-xs text-gray-500">change detected</div>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {change.before_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Before</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {change.after_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">After</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {change.affected_users_count}
                    </div>
                    <div className="text-xs text-gray-500">Affected Users</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {change.confidence_score}%
                    </div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                </div>

                {/* Recommendations */}
                {change.recommendations.length > 0 && (
                  <div className="bg-gray-50 rounded p-4">
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="space-y-1">
                      {change.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-purple-600 mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-500">
                  <span>Detected: {new Date(change.detected_at).toLocaleDateString()}</span>
                  {change.niches_affected.length > 0 && (
                    <span>Niches: {change.niches_affected.join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              No algorithm changes detected yet. Run a test or wait for the scheduled detection to run.
            </p>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-purple-50 rounded-lg p-8">
        <h3 className="text-xl font-semibold mb-4">How Algorithm Detection Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              1
            </div>
            <h4 className="font-medium mb-2">Daily Collection</h4>
            <p className="text-sm text-gray-600">
              We aggregate performance data from all users daily
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              2
            </div>
            <h4 className="font-medium mb-2">Statistical Analysis</h4>
            <p className="text-sm text-gray-600">
              T-tests and effect size calculations identify significant changes
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              3
            </div>
            <h4 className="font-medium mb-2">Crowdsourced Validation</h4>
            <p className="text-sm text-gray-600">
              Changes must affect 30+ users with 20%+ impact
            </p>
          </div>
          <div>
            <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center mb-3">
              4
            </div>
            <h4 className="font-medium mb-2">48-Hour Confirmation</h4>
            <p className="text-sm text-gray-600">
              Changes are re-validated after 48 hours to reduce false positives
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}