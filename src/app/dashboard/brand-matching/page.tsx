'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Sparkles, Mail, Copy, Filter, Search, Building2, MapPin, Target, TrendingUp, Plus } from 'lucide-react'
import BrandRequest from '@/components/BrandRequest'
import Link from 'next/link'

interface BrandMatch {
  id: string
  brand: {
    id: string
    name: string
    instagram: string
    website: string
    industry: string
    pr_email: string
    response_rate: number
    headquarters_city: string
    headquarters_country: string
  }
  overallScore: number
  matchCategory: 'excellent' | 'good' | 'fair'
  scores: {
    valuesAlignment: { score: number; details: string[] }
    audienceResonance: { score: number; overlapPercentage: number; sharedInterests: string[] }
    contentStyleMatch: { score: number; matchingElements: string[]; concerns: string[] }
    successProbability: { score: number; factors: string[] }
  }
  insights: {
    strengths: string[]
    opportunities: string[]
    concerns: string[]
    suggestedApproach: string
    estimatedResponseRate: number
  }
  outreachStrategy: {
    personalizedHooks: string[]
    contentIdeas: string[]
    bestTiming: string
  }
}

export default function BrandMatchingPage() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<BrandMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<'all' | 'excellent' | 'good' | 'fair'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMatch, setSelectedMatch] = useState<BrandMatch | null>(null)
  const [generatingOutreach, setGeneratingOutreach] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (user) {
      checkOnboardingStatus()
      fetchMatches()
    }
  }, [user])

  const checkOnboardingStatus = async () => {
    const { data } = await supabase
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', user!.id)
      .single()

    if (!data?.profile_data?.identity) {
      setHasCompletedOnboarding(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/brand-matching/matches')
      const data = await response.json()
      
      if (data.matches) {
        setMatches(data.matches)
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateOutreach = async (match: BrandMatch) => {
    setGeneratingOutreach(true)
    try {
      const response = await fetch(`/api/brand-matching/outreach/${match.id}`, {
        method: 'GET'
      })
      const data = await response.json()
      
      // Show outreach modal with generated content
      // For now, just copy to clipboard
      if (data.emailDraft) {
        const emailText = `Subject: ${data.emailDraft.subject}\n\n${data.emailDraft.body}`
        navigator.clipboard.writeText(emailText)
        alert('Email draft copied to clipboard!')
      }
    } catch (error) {
      console.error('Error generating outreach:', error)
    } finally {
      setGeneratingOutreach(false)
    }
  }

  const filteredMatches = matches.filter(match => {
    const matchesCategory = filterCategory === 'all' || match.matchCategory === filterCategory
    const matchesSearch = searchTerm === '' || 
      match.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.brand.industry.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (!hasCompletedOnboarding) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Complete Your Brand Matching Profile</h1>
          <p className="text-gray-600 mb-8">
            Before we can match you with brands, we need to learn more about your content and audience.
          </p>
          <Link
            href="/onboarding/brand-matching"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90"
          >
            <Sparkles className="w-5 h-5" />
            Start Brand Matching Setup
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Brand Matches</h1>
        <p className="text-gray-600">
          AI-powered brand partnerships tailored to your content and audience
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Matches</p>
              <p className="text-2xl font-bold">{matches.length}</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Excellent Matches</p>
              <p className="text-2xl font-bold">
                {matches.filter(m => m.matchCategory === 'excellent').length}
              </p>
            </div>
            <Sparkles className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Match Score</p>
              <p className="text-2xl font-bold">
                {matches.length > 0 
                  ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready to Reach Out</p>
              <p className="text-2xl font-bold">
                {matches.filter(m => m.overallScore >= 70).length}
              </p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Matches</option>
              <option value="excellent">Excellent Only</option>
              <option value="good">Good & Above</option>
              <option value="fair">Fair & Above</option>
            </select>
          </div>
          <button
            onClick={fetchMatches}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Refresh Matches
          </button>
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Finding your perfect brand matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No matches found. Try adjusting your filters.</p>
          <button
            onClick={fetchMatches}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Refresh Matches
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMatches.map((match) => (
            <div
              key={match.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-xl font-semibold">{match.brand.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      match.matchCategory === 'excellent' 
                        ? 'bg-green-100 text-green-800'
                        : match.matchCategory === 'good'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {match.matchCategory.toUpperCase()} MATCH
                    </span>
                    <span className="text-sm text-gray-500">
                      {match.overallScore}% Match Score
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {match.brand.industry}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {match.brand.headquarters_city}, {match.brand.headquarters_country}
                    </span>
                    {match.brand.response_rate > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {match.brand.response_rate}% response rate
                      </span>
                    )}
                  </div>

                  {/* Key Insights */}
                  <div className="space-y-2">
                    {match.insights.strengths.slice(0, 2).map((strength, i) => (
                      <p key={i} className="text-sm text-green-700 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        {strength}
                      </p>
                    ))}
                    {match.scores.audienceResonance.overlapPercentage > 0 && (
                      <p className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">📍</span>
                        {match.scores.audienceResonance.overlapPercentage}% audience location overlap
                      </p>
                    )}
                  </div>

                  {/* Suggested Approach */}
                  <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 mb-1">Recommended Approach:</p>
                    <p className="text-sm text-purple-700">{match.insights.suggestedApproach}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-6">
                  <button
                    onClick={() => generateOutreach(match)}
                    disabled={generatingOutreach}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    {generatingOutreach ? 'Generating...' : 'Generate Outreach'}
                  </button>
                  <button
                    onClick={() => setSelectedMatch(match)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Brand Request Button */}
      <BrandRequest onRequestSubmitted={fetchMatches} />

      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMatch.brand.name}</h2>
                  <p className="text-gray-600">Detailed Match Analysis</p>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Detailed scores and insights */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Match Breakdown</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Values Alignment</span>
                        <span className="text-sm font-medium">{selectedMatch.scores.valuesAlignment.score}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${selectedMatch.scores.valuesAlignment.score}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Audience Match</span>
                        <span className="text-sm font-medium">{selectedMatch.scores.audienceResonance.score}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${selectedMatch.scores.audienceResonance.score}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Content Style</span>
                        <span className="text-sm font-medium">{selectedMatch.scores.contentStyleMatch.score}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${selectedMatch.scores.contentStyleMatch.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Content Ideas</h3>
                  <ul className="space-y-2">
                    {selectedMatch.outreachStrategy.contentIdeas.map((idea, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-purple-500 mt-0.5">•</span>
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => generateOutreach(selectedMatch)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90"
                >
                  Generate Outreach
                </button>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}