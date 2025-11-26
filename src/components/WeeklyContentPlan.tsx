'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, TrendingUp, Target, Lightbulb, Settings } from 'lucide-react'
import UserPreferencesModal from './UserPreferencesModal'
import { WellnessCard } from './wellness/WellnessCard'
import { WellnessButton } from './wellness/WellnessButton'
import { BreathingLoader } from './wellness/BreathingLoader'
import { cn } from '@/lib/utils'

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
  return <span className="text-2xl filter drop-shadow-sm">{icons[type as keyof typeof icons] || '📱'}</span>
}

const ConfidenceIndicator = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-wellness-green'
    if (score >= 60) return 'bg-wellness-yellow'
    return 'bg-wellness-coral'
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="w-12 h-2 bg-wellness-neutral-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-wellness-neutral-500 font-medium">{score}%</span>
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
      const cardWidth = 340 // Card width + margin (increased for wellness spacing)
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
      setCurrentIndex(index)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const cardWidth = 340
      const scrollLeft = scrollRef.current.scrollLeft
      const newIndex = Math.round(scrollLeft / cardWidth)
      setCurrentIndex(newIndex)
    }
  }

  if (loading) {
    return (
      <WellnessCard className="mb-8 min-h-[400px] flex flex-col items-center justify-center">
        <BreathingLoader text="Curating your mindful content plan..." size="lg" />
      </WellnessCard>
    )
  }

  if (!contentPlan) {
    return (
      <WellnessCard className="mb-8 text-center py-12" padding="xl">
        <div className="mb-6 bg-wellness-yellow-light w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Lightbulb className="w-10 h-10 text-wellness-yellow" />
        </div>
        <h3 className="text-2xl font-display font-bold text-wellness-neutral-900 mb-3">No Content Plan Yet</h3>
        <p className="text-wellness-neutral-500 mb-8 max-w-md mx-auto">
          Let's create a personalized strategy that aligns with your goals and wellness journey.
        </p>
        <WellnessButton
          onClick={() => setShowPreferences(true)}
          variant="primary"
        >
          Set Your Preferences
        </WellnessButton>
        
        <UserPreferencesModal
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          onSave={handlePreferencesSave}
        />
      </WellnessCard>
    )
  }

  return (
    <WellnessCard className="mb-8" padding="lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-wellness-neutral-900 mb-1">This Week's Content Flow</h2>
          <p className="text-wellness-neutral-500 flex items-center">
            <Calendar className="w-4 h-4 mr-2 opacity-70" />
            Week of {new Date(contentPlan.week_starting).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center space-x-3">
          <WellnessButton
            variant="ghost"
            size="sm"
            onClick={async () => {
              await fetch('/api/ai/clear-content-plans', { method: 'DELETE' })
              window.location.reload()
            }}
            className="text-wellness-coral hover:text-wellness-coral-soft hover:bg-wellness-coral-light"
          >
            Reset & Regenerate
          </WellnessButton>
          
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 rounded-xl hover:bg-wellness-neutral-100 transition-colors text-wellness-neutral-500 hover:text-wellness-purple"
            title="Update preferences"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-1 bg-wellness-neutral-100 rounded-xl p-1">
            <button
              onClick={() => scrollToIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => scrollToIndex(Math.min(contentPlan.suggestions.length - 1, currentIndex + 1))}
              disabled={currentIndex === contentPlan.suggestions.length - 1}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Cards - Horizontal Scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex space-x-6 overflow-x-auto scrollbar-hide pb-6 -mx-8 px-8"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {contentPlan.suggestions.map((suggestion, index) => {
          const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          const dayName = dayNames[suggestion.day - 1] || `Day ${suggestion.day}`
          const isActive = index === currentIndex
          
          return (
            <div
              key={index}
              className={cn(
                "flex-shrink-0 w-80 transition-all duration-500",
                isActive ? "scale-100 opacity-100" : "scale-95 opacity-70 hover:opacity-90"
              )}
              style={{ scrollSnapAlign: 'center' }}
              onClick={() => scrollToIndex(index)}
            >
              <WellnessCard 
                hover={isActive}
                glow={isActive}
                padding="md"
                className={cn(
                  "h-full border-2",
                  isActive ? "border-wellness-purple-soft/30" : "border-transparent bg-wellness-neutral-100/50"
                )}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-wellness-white shadow-sm flex items-center justify-center">
                      <PostTypeIcon type={suggestion.post_type} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-wellness-neutral-900">{dayName}</h3>
                      <p className="text-xs font-medium text-wellness-purple uppercase tracking-wider">
                        {suggestion.post_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm text-wellness-neutral-500 mb-1 bg-wellness-neutral-100 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 mr-1" />
                      {suggestion.optimal_posting_time}
                    </div>
                    <ConfidenceIndicator score={suggestion.confidence_score} />
                  </div>
                </div>

                {/* Content Topic */}
                <div className="mb-5">
                  <h4 className="font-medium text-wellness-neutral-900 mb-2 line-clamp-2 leading-tight">
                    {suggestion.content_topic}
                  </h4>
                  <p className="text-sm text-wellness-neutral-500 line-clamp-3 leading-relaxed">
                    {suggestion.caption_outline}
                  </p>
                </div>

                {/* Hashtags */}
                <div className="mb-5">
                  <div className="flex flex-wrap gap-2">
                    {suggestion.suggested_hashtags.slice(0, 3).map((hashtag, i) => (
                      <span key={i} className="text-xs bg-wellness-purple-light text-wellness-purple px-2.5 py-1 rounded-md font-medium">
                        {hashtag}
                      </span>
                    ))}
                    {suggestion.suggested_hashtags.length > 3 && (
                      <span className="text-xs text-wellness-neutral-500 px-2 py-1">+{suggestion.suggested_hashtags.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Performance Indicators */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="flex items-center space-x-2 bg-wellness-green-light/50 p-2 rounded-lg">
                    <TrendingUp className="w-3 h-3 text-wellness-green" />
                    <span className="text-wellness-neutral-700">Trend: {suggestion.reasoning.trend_alignment}%</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-wellness-blue-light/50 p-2 rounded-lg">
                    <Target className="w-3 h-3 text-wellness-blue" />
                    <span className="text-wellness-neutral-700">Goal: {suggestion.reasoning.goal_progression}%</span>
                  </div>
                </div>
                
                {/* Algorithm Optimization Indicator */}
                {suggestion.reasoning.algorithm_optimization && (
                  <div className="flex items-center space-x-2 text-xs bg-wellness-purple-light/30 p-2 rounded-lg border border-wellness-purple-light">
                    <span className="text-lg">🤖</span>
                    <span className="text-wellness-purple-soft font-medium">
                      Algorithm Match: {suggestion.reasoning.algorithm_optimization}%
                    </span>
                  </div>
                )}
              </WellnessCard>
            </div>
          )
        })}
      </div>

      {/* Strategy Summary */}
      {contentPlan.overall_strategy && (
        <div className="mt-6 p-6 bg-gradient-to-br from-wellness-purple-light to-white rounded-2xl border border-wellness-purple-light/50">
          <h3 className="font-display font-bold text-wellness-neutral-900 mb-3 flex items-center text-lg">
            <Lightbulb className="w-5 h-5 mr-2 text-wellness-purple" />
            Weekly Intention
          </h3>
          <p className="text-wellness-neutral-700 leading-relaxed">{contentPlan.overall_strategy}</p>
        </div>
      )}
      
      {/* User Preferences Modal */}
      <UserPreferencesModal
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        onSave={handlePreferencesSave}
      />
    </WellnessCard>
  )
}