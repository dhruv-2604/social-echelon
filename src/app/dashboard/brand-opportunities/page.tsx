'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, Filter, DollarSign, TrendingUp, Users, Target,
  ChevronRight, Mail, Instagram, ExternalLink, Sparkles,
  Heart, AlertCircle, Clock, CheckCircle
} from 'lucide-react'

interface BrandMatch {
  id: string
  brand: {
    id: string
    name: string
    logo_url?: string
    instagram_handle?: string
    website?: string
    industry: string
    description: string
    budget_range: { min: number; max: number }
    verified: boolean
  }
  overallScore: number
  matchCategory: 'excellent' | 'good' | 'fair' | 'poor'
  scores: {
    valuesAlignment: number
    audienceResonance: number
    contentStyleMatch: number
    successProbability: number
  }
  insights: {
    strengths: string[]
    opportunities: string[]
    concerns: string[]
    suggestedApproach: string
    estimatedResponseRate: number
  }
  financials: {
    suggestedRate: number
    marketRate: number
    negotiationRoom: string
  }
  status: string
  lastStatusUpdate: string
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'excellent': return 'from-green-500 to-emerald-500'
    case 'good': return 'from-blue-500 to-indigo-500'
    case 'fair': return 'from-yellow-500 to-orange-500'
    case 'poor': return 'from-gray-400 to-gray-500'
    default: return 'from-gray-400 to-gray-500'
  }
}

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case 'excellent': return '🌟'
    case 'good': return '✨'
    case 'fair': return '👍'
    case 'poor': return '🤔'
    default: return '📊'
  }
}

export default function BrandOpportunities() {
  const router = useRouter()
  const [matches, setMatches] = useState<BrandMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'excellent' | 'good' | 'fair'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<BrandMatch | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    fetchBrandMatches()
  }, [])

  async function fetchBrandMatches() {
    try {
      // Check if user has completed onboarding
      const profileRes = await fetch('/api/brand-matching/profile')
      const profileData = await profileRes.json()
      
      if (!profileData.hasProfile) {
        setHasProfile(false)
        setLoading(false)
        return
      }
      
      setHasProfile(true)
      
      // Fetch matches
      const matchesRes = await fetch('/api/brand-matching/matches')
      const matchesData = await matchesRes.json()
      
      if (matchesData.matches) {
        setMatches(matchesData.matches)
      }
    } catch (error) {
      console.error('Error fetching brand matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMatches = matches.filter(match => {
    const matchesFilter = filter === 'all' || match.matchCategory === filter
    const matchesSearch = searchQuery === '' || 
      match.brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.brand.industry.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect brand matches...</p>
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Unlock Brand Partnerships
          </h2>
          <p className="text-gray-600 mb-8">
            Complete our brand matching profile to discover partnerships perfectly aligned with your content and values.
          </p>
          <button
            onClick={() => router.push('/onboarding/brand-matching')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Start Brand Matching Setup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Brand Opportunities</h1>
              <p className="text-gray-600 mt-1">
                {matches.length} perfect matches found for you
              </p>
            </div>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'excellent', 'good', 'fair'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === filterOption
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  {filterOption !== 'all' && ` ${getCategoryEmoji(filterOption)}`}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {matches.filter(m => m.matchCategory === 'excellent').length}
              </div>
              <div className="text-sm text-gray-600">Excellent Matches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(matches.reduce((acc, m) => acc + m.insights.estimatedResponseRate, 0) / matches.length)}%
              </div>
              <div className="text-sm text-gray-600">Avg Response Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${Math.round(matches.reduce((acc, m) => acc + m.financials.suggestedRate, 0) / matches.length)}
              </div>
              <div className="text-sm text-gray-600">Avg Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {matches.filter(m => m.status === 'contacted').length}
              </div>
              <div className="text-sm text-gray-600">Contacted</div>
            </div>
          </div>
        </div>

        {/* Brand Matches Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedMatch(match)}
            >
              {/* Match Score Header */}
              <div className={`h-2 rounded-t-lg bg-gradient-to-r ${getCategoryColor(match.matchCategory)}`} />
              
              <div className="p-6">
                {/* Brand Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {match.brand.logo_url ? (
                      <img 
                        src={match.brand.logo_url} 
                        alt={match.brand.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-400">
                          {match.brand.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-1">
                        {match.brand.name}
                        {match.brand.verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{match.brand.industry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {match.overallScore}%
                    </div>
                    <div className="text-xs text-gray-600">Match Score</div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="space-y-2 mb-4">
                  {match.insights.strengths.slice(0, 2).map((strength, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Info */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900">
                      ${match.financials.suggestedRate}
                    </span>
                    <span className="text-sm text-gray-600">per post</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span>{match.insights.estimatedResponseRate}% response</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/brand-opportunities/${match.id}/outreach`)
                  }}
                >
                  <Mail className="w-4 h-4" />
                  <span>Start Outreach</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {/* Match Details Modal */}
      {selectedMatch && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMatch(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{selectedMatch.brand.name}</h2>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Score Breakdown */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Match Score Breakdown</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Values Alignment</span>
                      <span>{selectedMatch.scores.valuesAlignment}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${selectedMatch.scores.valuesAlignment}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Audience Resonance</span>
                      <span>{selectedMatch.scores.audienceResonance}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${selectedMatch.scores.audienceResonance}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Content Style Match</span>
                      <span>{selectedMatch.scores.contentStyleMatch}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-pink-500 rounded-full"
                        style={{ width: `${selectedMatch.scores.contentStyleMatch}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Success Probability</span>
                      <span>{selectedMatch.scores.successProbability}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${selectedMatch.scores.successProbability}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Key Insights</h3>
                
                {selectedMatch.insights.strengths.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {selectedMatch.insights.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMatch.insights.opportunities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Opportunities</h4>
                    <ul className="space-y-1">
                      {selectedMatch.insights.opportunities.map((opportunity, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600">{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMatch.insights.concerns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Considerations</h4>
                    <ul className="space-y-1">
                      {selectedMatch.insights.concerns.map((concern, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-600">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Financial Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Financial Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Suggested Rate</span>
                    <p className="font-semibold text-lg text-gray-900">${selectedMatch.financials.suggestedRate}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Market Rate</span>
                    <p className="font-semibold text-lg text-gray-900">${selectedMatch.financials.marketRate}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">{selectedMatch.financials.negotiationRoom}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/dashboard/brand-opportunities/${selectedMatch.id}/outreach`)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Start Outreach
                </button>
                <button
                  onClick={() => window.open(selectedMatch.brand.website, '_blank')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Visit Website</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}