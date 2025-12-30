'use client'

import { useEffect, useState } from 'react'
import { CreativeSpace } from '@/components/wellness/CreativeSpace'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { Sparkles, Brain, TrendingUp, Clock, RefreshCw } from 'lucide-react'

interface ContentSuggestion {
  content_type?: string
  hook?: string
  content_idea: string
  caption_starter?: string
  hashtags?: string[]
  optimal_posting_time?: string
  confidence_score?: number
  why_it_will_work?: string
}

interface WeeklyPlan {
  content_suggestions?: ContentSuggestion[]
  created_at?: string
  expires_at?: string
}

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWeeklyPlan()
  }, [])

  const fetchWeeklyPlan = async () => {
    try {
      setError(null)
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 800))

      const response = await fetch('/api/ai/get-content-plan')
      if (!response.ok) throw new Error('Failed to fetch plan')
      const data = await response.json()
      setWeeklyPlan(data)
    } catch (err) {
      console.error('Error fetching plan:', err)
      setError('Unable to load your content plan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateNewPlan = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('/api/ai/generate-content-plan', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to generate plan')
      const data = await response.json()
      setWeeklyPlan(data)
    } catch (err) {
      console.error('Error generating plan:', err)
      setError('Unable to generate your content plan. Please try again in a moment.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <BreathingLoader 
          text="Preparing your creative space..." 
          size="lg"
        />
      </div>
    )
  }

  if (generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <WellnessCard className="max-w-md mx-auto text-center">
          <div className="space-y-4">
            <Brain className="w-16 h-16 mx-auto text-purple-600 animate-pulse" />
            <h2 className="text-xl font-light text-gray-800">
              AI is crafting your perfect week
            </h2>
            <p className="text-gray-600">
              This takes about 30 seconds. Your content will be personalized to your audience.
            </p>
            <BreathingLoader size="sm" text="" />
          </div>
        </WellnessCard>
      </div>
    )
  }

  if (error && !weeklyPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <WellnessCard className="max-w-md mx-auto text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-light text-gray-800">
              Taking a Moment
            </h2>
            <p className="text-gray-600">
              {error}
            </p>
            <WellnessButton onClick={fetchWeeklyPlan} variant="primary">
              Try Again
            </WellnessButton>
          </div>
        </WellnessCard>
      </div>
    )
  }

  // Map API content types to CreativeSpace types
  const mapContentType = (type?: string): 'reel' | 'carousel' | 'image' | 'story' => {
    const typeMap: Record<string, 'reel' | 'carousel' | 'image' | 'story'> = {
      'reels': 'reel',
      'reel': 'reel',
      'carousel_album': 'carousel',
      'carousel': 'carousel',
      'image': 'image',
      'video': 'reel',
      'story': 'story'
    }
    return typeMap[type?.toLowerCase() || ''] || 'reel'
  }

  // Transform API data to CreativeSpace format if needed
  const suggestions = weeklyPlan?.content_suggestions?.map((item: ContentSuggestion, index: number) => ({
    id: `${index}`,
    type: mapContentType(item.content_type),
    title: item.hook || 'Content Suggestion',
    content: item.content_idea,
    caption: item.caption_starter || '',
    hashtags: item.hashtags || [],
    bestTime: item.optimal_posting_time || '9:00 AM',
    confidenceScore: item.confidence_score || 75,
    reasoning: item.why_it_will_work || ''
  })) || []

  return (
    <CreativeSpace 
      suggestions={suggestions}
      weeklyPlan={weeklyPlan}
      onRefreshSuggestions={generateNewPlan}
      onSaveSuggestion={(id) => {
        console.log('Saved suggestion:', id)
        // TODO: Implement save functionality
      }}
    />
  )
}