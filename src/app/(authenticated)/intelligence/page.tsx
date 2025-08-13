'use client'

import { useEffect, useState } from 'react'
import { CreativeSpace } from '@/components/wellness/CreativeSpace'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import { Sparkles, Brain, TrendingUp, Clock } from 'lucide-react'

export default function IntelligencePage() {
  const [loading, setLoading] = useState(true)
  const [weeklyPlan, setWeeklyPlan] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchWeeklyPlan()
  }, [])

  const fetchWeeklyPlan = async () => {
    try {
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const response = await fetch('/api/ai/get-content-plan')
      if (!response.ok) throw new Error('Failed to fetch plan')
      const data = await response.json()
      setWeeklyPlan(data)
    } catch (error) {
      console.error('Error fetching plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewPlan = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-content-plan', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to generate plan')
      const data = await response.json()
      setWeeklyPlan(data)
    } catch (error) {
      console.error('Error generating plan:', error)
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

  // Transform API data to CreativeSpace format if needed
  const suggestions = weeklyPlan?.content_suggestions?.map((item: any, index: number) => ({
    id: `${index}`,
    type: item.content_type?.toLowerCase() || 'reel',
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