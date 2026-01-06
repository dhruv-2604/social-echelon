'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, DollarSign, TrendingUp, Users, Target,
  ChevronRight, Mail, Instagram, ExternalLink, Sparkles,
  Heart, AlertCircle, Clock, CheckCircle, Flower2, TreePine,
  Leaf, MapPin, Send
} from 'lucide-react'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'

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
    case 'excellent': return 'from-pink-400 to-purple-400'
    case 'good': return 'from-blue-400 to-green-400'
    case 'fair': return 'from-yellow-400 to-orange-400'
    case 'poor': return 'from-gray-300 to-gray-400'
    default: return 'from-gray-300 to-gray-400'
  }
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'excellent': return <Flower2 className="w-5 h-5 text-pink-500" />
    case 'good': return <TreePine className="w-5 h-5 text-green-500" />
    case 'fair': return <Leaf className="w-5 h-5 text-yellow-500" />
    default: return <Sparkles className="w-5 h-5 text-gray-500" />
  }
}

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'excellent': return 'In Full Bloom'
    case 'good': return 'Growing Strong'
    case 'fair': return 'New Seedling'
    case 'poor': return 'Early Stage'
    default: return 'Exploring'
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

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMatch) {
        setSelectedMatch(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedMatch])

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
      <div className="min-h-screen flex items-center justify-center">
        <BreathingLoader text="Cultivating your partnership garden..." size="lg" />
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Flower2 className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-light text-gray-900 mb-4">
            Grow Your Partnership Garden
          </h2>
          <p className="text-gray-600 mb-8">
            Let's find brands that align with your values and content style. Our AI will nurture perfect partnerships while you focus on creating.
          </p>
          <button
            onClick={() => router.push('/onboarding/brand-matching')}
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Plant Your First Seeds 🌱
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100/50 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Your Partnership Garden</h1>
              <p className="text-gray-600 mt-1">
                {matches.length} partnerships ready to bloom
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/50 p-6 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search partnerships..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'excellent', 'good', 'fair'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    filter === filterOption
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filterOption === 'all' ? 'All' : getCategoryLabel(filterOption)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg">
              <div className="text-2xl font-light text-purple-600">
                {matches.filter(m => m.matchCategory === 'excellent').length}
              </div>
              <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                <Flower2 className="w-4 h-4" />
                Full Bloom
              </div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg">
              <div className="text-2xl font-light text-green-600">
                {Math.round(matches.reduce((acc, m) => acc + m.insights.estimatedResponseRate, 0) / matches.length)}%
              </div>
              <div className="text-sm text-gray-600">Connection Rate</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <div className="text-2xl font-light text-blue-600">
                ${Math.round(matches.reduce((acc, m) => acc + m.financials.suggestedRate, 0) / matches.length)}
              </div>
              <div className="text-sm text-gray-600">Avg Value</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-green-50 rounded-lg">
              <div className="text-2xl font-light text-orange-600">
                {matches.filter(m => m.status === 'contacted').length}
              </div>
              <div className="text-sm text-gray-600">Nurturing</div>
            </div>
          </div>
        </motion.div>

        {/* Brand Matches Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMatches.map((match, index) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100/50"
              onClick={() => setSelectedMatch(match)}
            >
              {/* Match Score Header */}
              <div className={`h-2 rounded-t-xl bg-gradient-to-r ${getCategoryColor(match.matchCategory)}`} />
              
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
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-light text-purple-600">
                          {match.brand.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center gap-1">
                        {match.brand.name}
                        {match.brand.verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600">{match.brand.industry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getCategoryIcon(match.matchCategory)}
                    <div className="text-xs text-gray-600 mt-1">
                      {match.overallScore}%
                    </div>
                  </div>
                </div>

                {/* Match Scores as Progress Bars */}
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Value Alignment</span>
                      <span className="text-gray-800">{match.scores.valuesAlignment}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${match.scores.valuesAlignment}%` }}
                        transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">Audience Match</span>
                      <span className="text-gray-800">{match.scores.audienceResonance}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${match.scores.audienceResonance}%` }}
                        transition={{ delay: index * 0.05 + 0.4, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="space-y-2 mb-4">
                  {match.insights.strengths.slice(0, 2).map((strength, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-sm">
                      <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{strength}</span>
                    </div>
                  ))}
                </div>

                {/* Financial Info */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">
                      ${match.financials.suggestedRate}
                    </span>
                    <span className="text-sm text-gray-600">per post</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Heart className="w-4 h-4 text-pink-500" />
                    <span>{match.insights.estimatedResponseRate}%</span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center space-x-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/brand-opportunities/${match.id}/outreach`)
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>Express Interest</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMatches.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No partnerships found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </motion.div>
        )}
      </div>

      {/* Match Details Modal - KEEP ALL FUNCTIONALITY */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMatch(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="brand-match-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedMatch.brand.logo_url ? (
                      <img 
                        src={selectedMatch.brand.logo_url} 
                        alt={selectedMatch.brand.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-light text-purple-600">
                          {selectedMatch.brand.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 id="brand-match-title" className="text-2xl font-light text-gray-900 flex items-center gap-2">
                        {selectedMatch.brand.name}
                        {selectedMatch.brand.verified && (
                          <CheckCircle className="w-5 h-5 text-blue-500" />
                        )}
                      </h2>
                      <p className="text-gray-600">{selectedMatch.brand.industry}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Score Breakdown */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Partnership Strength</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Values Alignment</span>
                        <span className="font-medium">{selectedMatch.scores.valuesAlignment}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.scores.valuesAlignment}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Audience Resonance</span>
                        <span className="font-medium">{selectedMatch.scores.audienceResonance}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.scores.audienceResonance}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                          className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Content Style Match</span>
                        <span className="font-medium">{selectedMatch.scores.contentStyleMatch}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.scores.contentStyleMatch}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Success Probability</span>
                        <span className="font-medium">{selectedMatch.scores.successProbability}%</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.scores.successProbability}%` }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Partnership Insights</h3>
                  
                  {selectedMatch.insights.strengths.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths</h4>
                      <ul className="space-y-2">
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
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Growth Opportunities</h4>
                      <ul className="space-y-2">
                        {selectedMatch.insights.opportunities.map((opportunity, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <TreePine className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600">{opportunity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedMatch.insights.concerns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Considerations</h4>
                      <ul className="space-y-2">
                        {selectedMatch.insights.concerns.map((concern, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedMatch.insights.suggestedApproach && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Approach</h4>
                      <p className="text-sm text-gray-600">{selectedMatch.insights.suggestedApproach}</p>
                    </div>
                  )}
                </div>

                {/* Financial Details */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Partnership Value</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Suggested Rate</span>
                      <p className="font-medium text-lg text-gray-900">${selectedMatch.financials.suggestedRate}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Market Rate</span>
                      <p className="font-medium text-lg text-gray-900">${selectedMatch.financials.marketRate}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{selectedMatch.financials.negotiationRoom}</p>
                </div>

                {/* Brand Links */}
                <div className="flex gap-4">
                  {selectedMatch.brand.instagram_handle && (
                    <a
                      href={`https://instagram.com/${selectedMatch.brand.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <Instagram className="w-4 h-4" />
                      @{selectedMatch.brand.instagram_handle}
                    </a>
                  )}
                  {selectedMatch.brand.website && (
                    <a
                      href={selectedMatch.brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </a>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      router.push(`/dashboard/brand-opportunities/${selectedMatch.id}/outreach`)
                      setSelectedMatch(null)
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Start Partnership Conversation
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}