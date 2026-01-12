'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Trash2, CheckCircle, AlertTriangle, Clock, Search, Filter } from 'lucide-react'

interface DeadLetter {
  id: string
  original_job_id: string
  job_type: string
  user_id: string | null
  payload: Record<string, unknown>
  error_history: Array<{ error: string; retry: number; at: string }>
  final_error: string
  retry_count: number
  max_retries: number
  original_created_at: string
  failed_at: string
  status: 'dead' | 'retrying' | 'resolved'
  resolution_notes: string | null
  resolved_at: string | null
}

interface DLQStats {
  total: number
  dead: number
  retrying: number
  resolved: number
  byType: Record<string, number>
}

export default function DeadLetterQueuePage() {
  const [deadLetters, setDeadLetters] = useState<DeadLetter[]>([])
  const [stats, setStats] = useState<DLQStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('dead')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDL, setSelectedDL] = useState<DeadLetter | null>(null)
  const [resolveNotes, setResolveNotes] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const jobTypes = [
    'algorithm_detection',
    'content_generation',
    'trend_collection',
    'brand_discovery',
    'instagram_sync',
    'performance_collection'
  ]

  useEffect(() => {
    fetchDeadLetters()
  }, [statusFilter, typeFilter])

  const fetchDeadLetters = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        includeStats: 'true',
        limit: '100'
      })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('jobType', typeFilter)

      const res = await fetch(`/api/admin/dead-letter-queue?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      setDeadLetters(data.deadLetters)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching dead letters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (dlqId: string) => {
    setActionLoading(dlqId)
    try {
      const res = await fetch('/api/admin/dead-letter-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', dlqId })
      })

      if (!res.ok) throw new Error('Retry failed')

      const data = await res.json()
      alert(`Job queued for retry: ${data.newJobId}`)
      fetchDeadLetters()
    } catch (error) {
      console.error('Retry error:', error)
      alert('Failed to retry dead letter')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async () => {
    if (!selectedDL || !resolveNotes.trim()) return

    setActionLoading(selectedDL.id)
    try {
      const res = await fetch('/api/admin/dead-letter-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          dlqId: selectedDL.id,
          notes: resolveNotes
        })
      })

      if (!res.ok) throw new Error('Resolve failed')

      setSelectedDL(null)
      setResolveNotes('')
      fetchDeadLetters()
    } catch (error) {
      console.error('Resolve error:', error)
      alert('Failed to resolve dead letter')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkRetry = async (jobType: string) => {
    if (!confirm(`Retry all failed ${jobType} jobs?`)) return

    setActionLoading(`bulk-${jobType}`)
    try {
      const res = await fetch('/api/admin/dead-letter-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulkRetry', jobType })
      })

      if (!res.ok) throw new Error('Bulk retry failed')

      const data = await res.json()
      alert(`${data.retriedCount} jobs queued for retry`)
      fetchDeadLetters()
    } catch (error) {
      console.error('Bulk retry error:', error)
      alert('Failed to bulk retry')
    } finally {
      setActionLoading(null)
    }
  }

  const handlePurge = async () => {
    if (!confirm('Purge resolved dead letters older than 30 days?')) return

    setActionLoading('purge')
    try {
      const res = await fetch('/api/admin/dead-letter-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge', olderThanDays: 30 })
      })

      if (!res.ok) throw new Error('Purge failed')

      const data = await res.json()
      alert(`${data.purgedCount} resolved dead letters purged`)
      fetchDeadLetters()
    } catch (error) {
      console.error('Purge error:', error)
      alert('Failed to purge')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredDeadLetters = deadLetters.filter(dl => {
    if (!searchTerm) return true
    return dl.final_error.toLowerCase().includes(searchTerm.toLowerCase()) ||
           dl.job_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
           dl.id.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'dead': return 'bg-red-100 text-red-800'
      case 'retrying': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dead Letter Queue</h1>
        <p className="text-gray-600">Manage failed jobs that exceeded retry limits</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-600">Dead</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.dead}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              <p className="text-sm text-gray-600">Retrying</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.retrying}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
      )}

      {/* Failed by Type */}
      {stats && Object.keys(stats.byType).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Failed Jobs by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <button
                key={type}
                onClick={() => handleBulkRetry(type)}
                disabled={actionLoading === `bulk-${type}`}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <span className="font-medium">{type}:</span>
                <span>{count}</span>
                <RefreshCw className={`w-3 h-3 ${actionLoading === `bulk-${type}` ? 'animate-spin' : ''}`} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by error, type, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="dead">Dead</option>
              <option value="retrying">Retrying</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              {jobTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchDeadLetters}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handlePurge}
              disabled={actionLoading === 'purge'}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Purge Old
            </button>
          </div>
        </div>
      </div>

      {/* Dead Letters Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredDeadLetters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p>No dead letters found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Retries
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Failed At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeadLetters.map(dl => (
                <tr key={dl.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dl.job_type}</div>
                    <div className="text-xs text-gray-500 font-mono">{dl.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={dl.final_error}>
                      {dl.final_error}
                    </div>
                    {dl.user_id && (
                      <div className="text-xs text-gray-500">User: {dl.user_id.slice(0, 8)}...</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dl.retry_count} / {dl.max_retries}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(dl.failed_at)}</div>
                    <div className="text-xs text-gray-500">Created: {formatDate(dl.original_created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dl.status)}`}>
                      {dl.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {dl.status === 'dead' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRetry(dl.id)}
                          disabled={actionLoading === dl.id}
                          className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${actionLoading === dl.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                        <button
                          onClick={() => setSelectedDL(dl)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                    {dl.status === 'resolved' && dl.resolution_notes && (
                      <span className="text-gray-500 text-xs" title={dl.resolution_notes}>
                        {dl.resolution_notes.slice(0, 30)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolve Modal */}
      {selectedDL && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Resolve Dead Letter</h2>
                <button
                  onClick={() => { setSelectedDL(null); setResolveNotes('') }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Job Type: {selectedDL.job_type}</p>
                <p className="text-sm text-gray-600 mt-1">Error: {selectedDL.final_error}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Explain why this is being resolved without retry..."
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedDL(null); setResolveNotes('') }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolveNotes.trim() || actionLoading === selectedDL.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === selectedDL.id ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
