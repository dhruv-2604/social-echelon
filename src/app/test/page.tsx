'use client'

import { useState } from 'react'

export default function TestPage() {
  const [token, setToken] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testToken = async () => {
    if (!token) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/test-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: token }),
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to test token' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Token Test Page</h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste your access token from Graph API Explorer:
          </label>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your access token here..."
            className="w-full p-3 border border-gray-300 rounded-lg h-24 font-mono text-sm"
          />
          <button
            onClick={testToken}
            disabled={!token || loading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Token'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-bold mb-4">Results:</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}