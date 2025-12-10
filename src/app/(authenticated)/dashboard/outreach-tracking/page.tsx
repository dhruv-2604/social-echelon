'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Send, Mail, Clock, CheckCircle, XCircle, TrendingUp, Calendar, Download, Eye, RefreshCw, BellRing } from 'lucide-react'
import Link from 'next/link'

interface PendingFollowUp {
  brandName: string
  followUpNumber: number
  scheduledFor: string
  originalSentAt: string
}

interface FollowUpStats {
  totalScheduled: number
  dueToday: number
  dueThisWeek: number
}

interface OutreachRecord {
  id: string
  brand: {
    display_name: string
    instagram_handle: string
    industry: string
    response_rate: number
  }
  match_score: number
  outreach_sent: boolean
  outreach_sent_at: string
  response_received: boolean
  response_type: 'positive' | 'negative' | 'negotiating' | null
  created_at: string
}

export default function OutreachTrackingPage() {
  const { user } = useAuth()
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'sent' | 'pending' | 'responded'>('all')
  const [dateRange, setDateRange] = useState('30') // days
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([])
  const [followUpStats, setFollowUpStats] = useState<FollowUpStats>({ totalScheduled: 0, dueToday: 0, dueThisWeek: 0 })
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (user) {
      fetchOutreachData()
      fetchFollowUps()
    }
  }, [user, filter, dateRange])

  const fetchOutreachData = async () => {
    try {
      let query = supabase
        .from('user_brand_matches')
        .select(`
          *,
          brand:brands (
            display_name,
            instagram_handle,
            industry,
            response_rate
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filter === 'sent') {
        query = query.eq('outreach_sent', true)
      } else if (filter === 'pending') {
        query = query.eq('outreach_sent', false)
      } else if (filter === 'responded') {
        query = query.eq('response_received', true)
      }

      // Date range filter
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      query = query.gte('created_at', startDate.toISOString())

      const { data, error } = await query

      if (error) throw error
      setOutreachRecords(data || [])
    } catch (error) {
      console.error('Error fetching outreach data:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsResponded = async (recordId: string, responseType: 'positive' | 'negative' | 'negotiating') => {
    try {
      const { error } = await supabase
        .from('user_brand_matches')
        .update({ 
          response_received: true,
          response_type: responseType
        })
        .eq('id', recordId)

      if (error) throw error
      
      // Update local state
      setOutreachRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, response_received: true, response_type: responseType }
          : record
      ))
    } catch (error) {
      console.error('Error updating response:', error)
    }
  }

  const exportData = () => {
    const csv = [
      ['Brand', 'Instagram', 'Industry', 'Match Score', 'Outreach Sent', 'Sent Date', 'Response', 'Response Type'],
      ...outreachRecords.map(r => [
        r.brand.display_name,
        `@${r.brand.instagram_handle}`,
        r.brand.industry,
        `${r.match_score}%`,
        r.outreach_sent ? 'Yes' : 'No',
        r.outreach_sent_at ? new Date(r.outreach_sent_at).toLocaleDateString() : '',
        r.response_received ? 'Yes' : 'No',
        r.response_type || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outreach-tracking-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Calculate stats
  const stats = {
    totalMatches: outreachRecords.length,
    outreachSent: outreachRecords.filter(r => r.outreach_sent).length,
    responsesReceived: outreachRecords.filter(r => r.response_received).length,
    positiveResponses: outreachRecords.filter(r => r.response_type === 'positive').length,
    responseRate: outreachRecords.filter(r => r.outreach_sent).length > 0
      ? Math.round((outreachRecords.filter(r => r.response_received).length / outreachRecords.filter(r => r.outreach_sent).length) * 100)
      : 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Outreach Tracking</h1>
        <p className="text-gray-600">Monitor your brand outreach performance and responses</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold">{stats.totalMatches}</p>
            </div>
            <Eye className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outreach Sent</p>
              <p className="text-2xl font-bold">{stats.outreachSent}</p>
            </div>
            <Send className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Responses</p>
              <p className="text-2xl font-bold">{stats.responsesReceived}</p>
            </div>
            <Mail className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Positive</p>
              <p className="text-2xl font-bold">{stats.positiveResponses}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold">{stats.responseRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Matches</option>
              <option value="pending">Pending Outreach</option>
              <option value="sent">Outreach Sent</option>
              <option value="responded">Responded</option>
            </select>
            
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">All time</option>
            </select>
          </div>
          
          <button
            onClick={exportData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Outreach Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Brand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outreach Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Response
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {outreachRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {record.brand.display_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{record.brand.instagram_handle} • {record.brand.industry}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{record.match_score}%</span>
                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${record.match_score}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.outreach_sent ? (
                    <div className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-gray-900">
                        Sent {new Date(record.outreach_sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 text-yellow-500 mr-2" />
                      <span className="text-gray-500">Not sent</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.response_received ? (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      record.response_type === 'positive' 
                        ? 'bg-green-100 text-green-800'
                        : record.response_type === 'negotiating'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.response_type}
                    </span>
                  ) : record.outreach_sent ? (
                    <span className="text-sm text-gray-500">Awaiting response</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!record.outreach_sent ? (
                    <Link
                      href={`/dashboard/brand-matching`}
                      className="text-purple-600 hover:text-purple-900 font-medium"
                    >
                      Generate Outreach
                    </Link>
                  ) : !record.response_received ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAsResponded(record.id, 'positive')}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as positive response"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => markAsResponded(record.id, 'negotiating')}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Mark as negotiating"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => markAsResponded(record.id, 'negative')}
                        className="text-red-600 hover:text-red-900"
                        title="Mark as negative response"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {outreachRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No outreach records found for the selected filters.</p>
            <Link
              href="/dashboard/brand-matching"
              className="text-purple-600 hover:text-purple-700 font-medium mt-2 inline-block"
            >
              View Brand Matches →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}