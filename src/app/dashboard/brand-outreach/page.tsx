'use client'

import { useState, useEffect } from 'react'
import { 
  Search, Target, Send, Mail, Instagram, TrendingUp, 
  Calendar, Users, AlertCircle, CheckCircle, Clock,
  BarChart3, MessageSquare, RefreshCw, DollarSign
} from 'lucide-react'

interface OutreachStats {
  totalOutreachSent: number
  totalResponses: number
  responseRate: number
  positiveResponses: number
  scheduledOutreach: number
  activeDeals: number
}

interface OutreachActivity {
  id: string
  brand_name: string
  brand_logo?: string
  channel: 'email' | 'instagram_dm'
  status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'deal_closed'
  sent_at?: string
  response_sentiment?: 'positive' | 'neutral' | 'negative'
  creator_name: string
  match_score: number
}

export default function BrandOutreachDashboard() {
  const [stats, setStats] = useState<OutreachStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<OutreachActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'responses' | 'deals'>('overview')

  useEffect(() => {
    fetchOutreachData()
  }, [])

  async function fetchOutreachData() {
    try {
      const response = await fetch('/api/brand-outreach/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setRecentActivity(data.recentActivity)
      }
    } catch (error) {
      console.error('Error fetching outreach data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runOutreachAutomation() {
    try {
      const response = await fetch('/api/brand-outreach/run-automation', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchOutreachData()
      }
    } catch (error) {
      console.error('Error running automation:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'sent':
        return <Send className="w-4 h-4 text-blue-500" />
      case 'opened':
        return <Mail className="w-4 h-4 text-purple-500" />
      case 'replied':
        return <MessageSquare className="w-4 h-4 text-green-500" />
      case 'deal_closed':
        return <DollarSign className="w-4 h-4 text-green-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-gray-100 text-gray-700'
      case 'sent':
        return 'bg-blue-100 text-blue-700'
      case 'opened':
        return 'bg-purple-100 text-purple-700'
      case 'replied':
        return 'bg-green-100 text-green-700'
      case 'deal_closed':
        return 'bg-green-600 text-white'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading outreach data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Brand Outreach Center</h1>
              <p className="text-gray-600 mt-1">Automated brand discovery and outreach management</p>
            </div>
            
            <button
              onClick={runOutreachAutomation}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run Automation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Send className="w-8 h-8 text-blue-500" />
                <span className="text-sm text-gray-500">This Month</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalOutreachSent}</div>
              <div className="text-sm text-gray-600 mt-1">Outreach Sent</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  {stats.responseRate}%
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalResponses}</div>
              <div className="text-sm text-gray-600 mt-1">Responses</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-purple-500" />
                <span className="text-sm text-gray-500">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.activeDeals}</div>
              <div className="text-sm text-gray-600 mt-1">Deals in Progress</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-indigo-500" />
                <span className="text-sm text-gray-500">Scheduled</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.scheduledOutreach}</div>
              <div className="text-sm text-gray-600 mt-1">Upcoming Outreach</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="border-b">
              <div className="flex space-x-8 px-6">
                {['overview', 'scheduled', 'responses', 'deals'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            {activity.channel === 'email' ? (
                              <Mail className="w-5 h-5 text-gray-600" />
                            ) : (
                              <Instagram className="w-5 h-5 text-pink-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{activity.brand_name}</div>
                            <div className="text-sm text-gray-600">
                              {activity.creator_name} • {activity.match_score}% match
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(activity.status)}`}>
                            {getStatusIcon(activity.status)}
                            <span>{activity.status.replace('_', ' ')}</span>
                          </div>
                          
                          {activity.response_sentiment && (
                            <div className={`w-3 h-3 rounded-full ${
                              activity.response_sentiment === 'positive' ? 'bg-green-500' :
                              activity.response_sentiment === 'neutral' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'scheduled' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Scheduled Outreach ({stats?.scheduledOutreach || 0})
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-yellow-800">
                          Outreach is automatically scheduled based on optimal send times and daily limits.
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Next batch will be sent in 2 hours.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'responses' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Brand Responses</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {stats?.positiveResponses || 0}
                      </div>
                      <div className="text-sm text-green-700 mt-1">Interested</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {((stats?.totalResponses || 0) - (stats?.positiveResponses || 0)) / 2}
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">Need More Info</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        {((stats?.totalResponses || 0) - (stats?.positiveResponses || 0)) / 2}
                      </div>
                      <div className="text-sm text-gray-700 mt-1">Not Interested</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'deals' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Active Deals</h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                    <Target className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                    <p className="text-purple-900 font-medium">
                      {stats?.activeDeals || 0} deals in negotiation
                    </p>
                    <p className="text-sm text-purple-700 mt-2">
                      Average deal value: ${((0) / Math.max(stats?.activeDeals || 1, 1)).toFixed(0)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}