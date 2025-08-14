'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessCard } from './WellnessCard'
import { WellnessButton } from './WellnessButton'
import { 
  Sparkles, 
  Calendar,
  Clock,
  Heart,
  Check,
  ChevronRight,
  RefreshCw,
  Bookmark,
  Sun,
  Zap,
  Coffee,
  Image,
  Film,
  FileText
} from 'lucide-react'

interface ContentSuggestion {
  id: string
  type: 'reel' | 'carousel' | 'image' | 'story'
  title: string
  content: string
  caption: string
  hashtags: string[]
  bestTime: string
  confidenceScore: number
  reasoning: string
}

interface CreativeSpaceProps {
  suggestions: ContentSuggestion[]
  onSaveSuggestion?: (id: string) => void
  onRefreshSuggestions?: () => void
  weeklyPlan?: any
}

export function CreativeSpace({ 
  suggestions = mockSuggestions, 
  onSaveSuggestion,
  onRefreshSuggestions,
  weeklyPlan
}: CreativeSpaceProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards')

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayIcons = [Coffee, Zap, Sun, Heart, Sparkles, Calendar, Clock]

  const handleSave = (id: string) => {
    setSavedItems(prev => new Set(prev).add(id))
    onSaveSuggestion?.(id)
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'reel': return <Film className="w-5 h-5" />
      case 'carousel': return <FileText className="w-5 h-5" />
      case 'image': return <Image className="w-5 h-5" />
      default: return <Sparkles className="w-5 h-5" />
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'var(--wellness-green)'
    if (score >= 60) return 'var(--wellness-blue)'
    return 'var(--wellness-purple)'
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-light text-gray-800 mb-2">
            Your Creative Space
          </h1>
          <p className="text-gray-600 text-lg">
            AI prepared these suggestions while you were recharging
          </p>
        </motion.div>

        {/* Week Overview */}
        <WellnessCard className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-light text-gray-800">This Week's Flow</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>

          {/* Day Selector */}
          <div className="flex gap-2 overflow-x-auto pb-4">
            {days.map((day, index) => {
              const Icon = dayIcons[index]
              return (
                <motion.button
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDay(index)}
                  className={`flex flex-col items-center p-4 rounded-xl min-w-[100px] transition-all ${
                    selectedDay === index
                      ? 'bg-gradient-to-br from-purple-100 to-blue-100 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${
                    selectedDay === index ? 'text-purple-600' : 'text-gray-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedDay === index ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    {day}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {index < suggestions.length ? '1 post' : 'Rest day'}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </WellnessCard>

        {/* Content Suggestions */}
        <AnimatePresence mode="wait">
          {viewMode === 'cards' ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {suggestions.slice(selectedDay * 2, (selectedDay + 1) * 2).map((suggestion, index) => (
                <ContentCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  saved={savedItems.has(suggestion.id)}
                  onSave={() => handleSave(suggestion.id)}
                  delay={index * 0.1}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {suggestions.map((suggestion, index) => (
                <TimelineCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  day={days[Math.floor(index / 2)]}
                  saved={savedItems.has(suggestion.id)}
                  onSave={() => handleSave(suggestion.id)}
                  delay={index * 0.05}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600 mb-4">
            {savedItems.size > 0 
              ? `Beautiful! You've queued ${savedItems.size} posts. They'll publish at the perfect time.`
              : 'Take your time. These suggestions will wait for you.'}
          </p>
          <div className="flex gap-4 justify-center">
            <WellnessButton
              variant="secondary"
              size="lg"
              onClick={onRefreshSuggestions}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New Ideas
            </WellnessButton>
            <WellnessButton
              variant="calm"
              size="lg"
            >
              Save for Later
            </WellnessButton>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ContentCard({ 
  suggestion, 
  saved, 
  onSave, 
  delay 
}: { 
  suggestion: ContentSuggestion
  saved: boolean
  onSave: () => void
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <WellnessCard hover className="h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              {getContentIcon(suggestion.type)}
            </div>
            <div>
              <h3 className="font-medium text-gray-800">{suggestion.title}</h3>
              <p className="text-sm text-gray-500 capitalize">{suggestion.type}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSave}
            className={`p-2 rounded-lg transition-colors ${
              saved 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            {saved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </motion.button>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-3">{suggestion.content}</p>

        {/* Caption Preview */}
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">{suggestion.caption}</p>
        </div>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.hashtags.map(tag => (
            <span key={tag} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Best at {suggestion.bestTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${suggestion.confidenceScore}%` }}
                transition={{ delay: delay + 0.3, duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: getConfidenceColor(suggestion.confidenceScore) }}
              />
            </div>
            <span className="text-xs text-gray-500">{suggestion.confidenceScore}%</span>
          </div>
        </div>
      </WellnessCard>
    </motion.div>
  )
}

function TimelineCard({ 
  suggestion, 
  day,
  saved, 
  onSave, 
  delay 
}: { 
  suggestion: ContentSuggestion
  day: string
  saved: boolean
  onSave: () => void
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <WellnessCard hover>
        <div className="flex items-center gap-4">
          <div className="text-center min-w-[80px]">
            <p className="text-xs text-gray-500">{day}</p>
            <p className="text-sm font-medium text-gray-700">{suggestion.bestTime}</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getContentIcon(suggestion.type)}
              <h3 className="font-medium text-gray-800">{suggestion.title}</h3>
              <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
                {suggestion.type}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{suggestion.content}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSave}
            className={`p-2 rounded-lg transition-colors ${
              saved 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400 hover:text-gray-600'
            }`}
          >
            {saved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </motion.button>
        </div>
      </WellnessCard>
    </motion.div>
  )
}

function getContentIcon(type: string) {
  switch (type) {
    case 'reel': return <Film className="w-5 h-5 text-purple-600" />
    case 'carousel': return <FileText className="w-5 h-5 text-blue-600" />
    case 'image': return <Image className="w-5 h-5 text-green-600" />
    default: return <Sparkles className="w-5 h-5 text-gray-600" />
  }
}

function getConfidenceColor(score: number) {
  if (score >= 80) return 'var(--wellness-green)'
  if (score >= 60) return 'var(--wellness-blue)'
  return 'var(--wellness-purple)'
}

// Mock data for demonstration
const mockSuggestions: ContentSuggestion[] = [
  {
    id: '1',
    type: 'reel',
    title: 'Morning Routine Magic',
    content: 'Share your authentic morning routine with a calming voiceover. Focus on one small ritual that brings you peace.',
    caption: 'Every great day starts with a moment of intention ☀️ What\'s your morning non-negotiable?',
    hashtags: ['morningroutine', 'mindfulness', 'wellness'],
    bestTime: '8:00 AM',
    confidenceScore: 85,
    reasoning: 'Morning content performs best with your audience'
  },
  {
    id: '2',
    type: 'carousel',
    title: '5 Lessons from This Week',
    content: 'Create a carousel sharing 5 gentle insights or lessons from your week. Keep it authentic and relatable.',
    caption: 'This week taught me to slow down and notice the small wins 🌱',
    hashtags: ['weeklyreflection', 'growthmindset', 'authenticity'],
    bestTime: '6:00 PM',
    confidenceScore: 78,
    reasoning: 'Educational carousels get 2x more saves'
  }
]