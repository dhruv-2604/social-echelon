'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, TrendingUp, Target, Lightbulb, Settings } from 'lucide-react'
import UserPreferencesModal from './UserPreferencesModal'

interface ContentSuggestion {
  day: number
  post_type: 'REELS' | 'CAROUSEL_ALBUM' | 'IMAGE' | 'VIDEO'
  content_topic: string
  caption_outline: string
  suggested_hashtags: string[]
  optimal_posting_time: string
  reasoning: {
    performance_match: number
    trend_alignment: number
    algorithm_optimization: number
    goal_progression: number
    audience_relevance: number
    explanation: string
  }
  confidence_score: number
}

interface WeeklyContentPlan {
  user_id: string
  week_starting: string
  suggestions: ContentSuggestion[]
  overall_strategy: string
  generated_at: string
}

const PostTypeIcon = ({ type }: { type: string }) => {
  const icons = {
    'REELS': '🎬',
    'CAROUSEL_ALBUM': '📸',
    'IMAGE': '🖼️',
    'VIDEO': '🎥'
  }
  return <span className="text-2xl">{icons[type as keyof typeof icons] || '📱'}</span>
}

const ConfidenceIndicator = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 font-medium">{score}%</span>
    </div>
  )
}

export default function WeeklyContentPlan() {
  const [contentPlan, setContentPlan] = useState<WeeklyContentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showPreferences, setShowPreferences] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchContentPlan()
    
    // Set up weekly refresh (every Sunday at 8 PM)
    const setupWeeklyRefresh = () => {
      const now = new Date()
      const nextSunday = new Date(now)
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7)
      nextSunday.setHours(20, 0, 0, 0) // 8 PM
      
      const timeUntilRefresh = nextSunday.getTime() - now.getTime()
      
      setTimeout(() => {
        fetchContentPlan()
        // Set up recurring weekly refresh
        setInterval(fetchContentPlan, 7 * 24 * 60 * 60 * 1000) // Every week
      }, timeUntilRefresh)
    }

    setupWeeklyRefresh()
  }, [])

  const fetchContentPlan = async (preferences?: any) => {
    try {
      setLoading(true)
      
      // If no preferences provided, try to get existing plan first
      if (!preferences) {
        const response = await fetch('/api/ai/get-content-plan')
        
        if (response.ok) {
          const data = await response.json()
          if (data.content_plan) {
            setContentPlan(data.content_plan)
            setLoading(false)
            return
          }
        }
        
        // No existing plan - check if user has saved preferences
        const profileResponse = await fetch('/api/user/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          
          if (profileData.profile?.preferences_set) {
            // User has preferences saved - generate plan automatically
            console.log('User has saved preferences, generating plan automatically')
            const generateResponse = await fetch('/api/ai/generate-content-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}) // Empty body - API will use saved preferences
            })

            if (generateResponse.ok) {
              const data = await generateResponse.json()
              setContentPlan(data.content_plan)
              setLoading(false)
              return
            }
          }
        }
        
        // No existing plan and no saved preferences - show preferences modal
        setShowPreferences(true)
        setLoading(false)
        return
      }
      
      // Generate new plan with preferences
      const generateResponse = await fetch('/api/ai/generate-content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (generateResponse.ok) {
        const data = await generateResponse.json()
        setContentPlan(data.content_plan)
      } else {
        console.error('Failed to generate content plan')
      }
    } catch (error) {
      console.error('Error fetching content plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreferencesSave = (preferences: any) => {
    fetchContentPlan(preferences)
  }

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const cardWidth = 320 // Card width + margin
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
      setCurrentIndex(index)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const cardWidth = 320
      const scrollLeft = scrollRef.current.scrollLeft
      const newIndex = Math.round(scrollLeft / cardWidth)
      setCurrentIndex(newIndex)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">This Week's AI Content Plan</h2>
          <div className="animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex space-x-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-80 h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!contentPlan) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Content Plan Available</h3>
          <p className="text-gray-500">We'll generate your personalized content plan soon!</p>
          <button
            onClick={() => setShowPreferences(true)}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Set Your Preferences
          </button>
        </div>
        
        {/* User Preferences Modal */}
        <UserPreferencesModal
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          onSave={handlePreferencesSave}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">This Week's AI Content Plan</h2>
          <p className="text-sm text-gray-600">
            Week of {new Date(contentPlan.week_starting).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })} • {contentPlan.suggestions.length} posts planned
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={async () => {
              await fetch('/api/ai/clear-content-plans', { method: 'DELETE' })
              window.location.reload()
            }}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            title="Clear content plans"
          >
            Clear & Regenerate
          </button>
          
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
            title="Update preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex space-x-1">
            {contentPlan.suggestions.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={() => scrollToIndex(Math.min(contentPlan.suggestions.length - 1, currentIndex + 1))}
            disabled={currentIndex === contentPlan.suggestions.length - 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Cards */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {contentPlan.suggestions.map((suggestion, index) => {
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          const dayName = dayNames[suggestion.day - 1] || `Day ${suggestion.day}`
          
          return (
            <div
              key={index}
              className="flex-shrink-0 w-80 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-100"
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <PostTypeIcon type={suggestion.post_type} />
                  <div>
                    <h3 className="font-bold text-gray-900">{dayName}</h3>
                    <p className="text-sm text-gray-600">{suggestion.post_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Clock className="w-4 h-4 mr-1" />
                    {suggestion.optimal_posting_time}
                  </div>
                  <ConfidenceIndicator score={suggestion.confidence_score} />
                </div>
              </div>

              {/* Content Topic */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {suggestion.content_topic}
                </h4>
                <p className="text-sm text-gray-700 line-clamp-3">
                  {suggestion.caption_outline}
                </p>
              </div>

              {/* Hashtags */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {suggestion.suggested_hashtags.slice(0, 4).map((hashtag, i) => (
                    <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {hashtag}
                    </span>
                  ))}
                  {suggestion.suggested_hashtags.length > 4 && (
                    <span className="text-xs text-gray-500">+{suggestion.suggested_hashtags.length - 4}</span>
                  )}
                </div>
              </div>

              {/* Performance Indicators */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-gray-600">Trend: {suggestion.reasoning.trend_alignment}%</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-600">Goal: {suggestion.reasoning.goal_progression}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Strategy Summary */}
      {contentPlan.overall_strategy && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <Lightbulb className="w-4 h-4 mr-2 text-purple-600" />
            This Week's Strategy
          </h3>
          <p className="text-sm text-gray-700">{contentPlan.overall_strategy}</p>
        </div>
      )}
      
      {/* User Preferences Modal */}
      <UserPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSave}
      />
    </div>
  )
}