'use client'

import { useState } from 'react'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

export default function TestCronPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testManualCollection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/manual-collect')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Collection failed')
      }
      
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const testCronEndpoint = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await fetch('/api/algorithm/collect?test=true')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Test failed')
      }
      
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-light text-gray-800 mb-8">Test Cron Jobs & Data Collection</h1>
        
        <div className="space-y-6">
          <WellnessCard>
            <h2 className="text-xl font-medium text-gray-800 mb-4">Manual Data Collection</h2>
            <p className="text-gray-600 mb-4">
              This will collect your Instagram performance data and save it to the database.
              Use this to populate today's data for dashboard metrics.
            </p>
            <WellnessButton 
              onClick={testManualCollection}
              disabled={loading}
              variant="calm"
            >
              {loading ? 'Collecting...' : 'Collect My Data Now'}
            </WellnessButton>
          </WellnessCard>

          <WellnessCard>
            <h2 className="text-xl font-medium text-gray-800 mb-4">Test Cron Endpoint</h2>
            <p className="text-gray-600 mb-4">
              This tests the actual cron endpoint that should run daily at 2 AM.
            </p>
            <WellnessButton 
              onClick={testCronEndpoint}
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Testing...' : 'Test Cron Endpoint'}
            </WellnessButton>
          </WellnessCard>

          {error && (
            <WellnessCard className="bg-red-50">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
            </WellnessCard>
          )}

          {result && (
            <WellnessCard className="bg-green-50">
              <h3 className="text-lg font-medium text-green-800 mb-2">Success!</h3>
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </WellnessCard>
          )}

          <WellnessCard>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Check Database</h3>
            <p className="text-gray-600 mb-4">
              After collecting data, run this SQL in Supabase to verify:
            </p>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`SELECT * FROM user_performance_summary 
WHERE user_id = 'aa3a46a6-ceca-4a83-bdfa-5b3b241731a5'
ORDER BY date DESC
LIMIT 5;`}
            </pre>
          </WellnessCard>

          <WellnessCard>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Cron Schedule</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Algorithm Collection:</span>
                <span className="font-mono">2:00 AM daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Algorithm Detection:</span>
                <span className="font-mono">3:00 AM daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Endpoint:</span>
                <span className="font-mono">/api/algorithm/collect</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-mono">GET</span>
              </div>
            </div>
          </WellnessCard>
        </div>
      </div>
    </div>
  )
}