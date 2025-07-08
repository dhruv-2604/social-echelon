'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface UserPreferences {
  niche: string
  primary_goal: 'growth' | 'engagement' | 'brand_partnerships' | 'sales'
  content_style: 'educational' | 'entertaining' | 'aspirational' | 'authentic'
  target_audience: string
  voice_tone: 'professional' | 'casual' | 'inspirational' | 'humorous'
  posting_frequency: number
}

interface UserPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (preferences: UserPreferences) => void
  initialPreferences?: Partial<UserPreferences>
}

export default function UserPreferencesModal({ 
  isOpen, 
  onClose, 
  onSave,
  initialPreferences = {}
}: UserPreferencesModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    niche: initialPreferences.niche || 'lifestyle',
    primary_goal: initialPreferences.primary_goal || 'growth',
    content_style: initialPreferences.content_style || 'authentic',
    target_audience: initialPreferences.target_audience || '',
    voice_tone: initialPreferences.voice_tone || 'casual',
    posting_frequency: initialPreferences.posting_frequency || 3
  })

  const handleSave = () => {
    onSave(preferences)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Content Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Niche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your niche?
            </label>
            <select
              value={preferences.niche}
              onChange={(e) => setPreferences({ ...preferences, niche: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="lifestyle">Lifestyle</option>
              <option value="fitness">Fitness & Health</option>
              <option value="business">Business & Entrepreneurship</option>
              <option value="fashion">Fashion & Style</option>
              <option value="food">Food & Cooking</option>
              <option value="travel">Travel</option>
              <option value="beauty">Beauty & Skincare</option>
              <option value="tech">Technology</option>
              <option value="parenting">Parenting</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Primary Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your primary goal?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'growth', label: 'Grow Followers', desc: 'Focus on increasing follower count' },
                { value: 'engagement', label: 'Boost Engagement', desc: 'Increase likes, comments, shares' },
                { value: 'brand_partnerships', label: 'Brand Partnerships', desc: 'Attract brand collaboration opportunities' },
                { value: 'sales', label: 'Drive Sales', desc: 'Convert followers to customers' }
              ].map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => setPreferences({ ...preferences, primary_goal: goal.value as any })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    preferences.primary_goal === goal.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{goal.label}</div>
                  <div className="text-sm text-gray-600">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your content style?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'educational', label: 'Educational', desc: 'Tips, tutorials, how-tos' },
                { value: 'entertaining', label: 'Entertaining', desc: 'Fun, humorous, engaging' },
                { value: 'aspirational', label: 'Aspirational', desc: 'Inspiring, aspirational lifestyle' },
                { value: 'authentic', label: 'Authentic', desc: 'Real, genuine, behind-the-scenes' }
              ].map((style) => (
                <button
                  key={style.value}
                  onClick={() => setPreferences({ ...preferences, content_style: style.value as any })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    preferences.content_style === style.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{style.label}</div>
                  <div className="text-sm text-gray-600">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who's your target audience?
            </label>
            <input
              type="text"
              value={preferences.target_audience}
              onChange={(e) => setPreferences({ ...preferences, target_audience: e.target.value })}
              placeholder="e.g., young professionals, moms, fitness enthusiasts"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Voice Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's your voice tone?
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'professional', label: 'Professional' },
                { value: 'casual', label: 'Casual' },
                { value: 'inspirational', label: 'Inspirational' },
                { value: 'humorous', label: 'Humorous' }
              ].map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setPreferences({ ...preferences, voice_tone: tone.value as any })}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    preferences.voice_tone === tone.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posting Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How often do you want to post per week?
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="7"
                value={preferences.posting_frequency}
                onChange={(e) => setPreferences({ ...preferences, posting_frequency: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-purple-600 min-w-[3rem]">
                {preferences.posting_frequency} {preferences.posting_frequency === 1 ? 'post' : 'posts'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!preferences.target_audience.trim()}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Generate Content Plan
          </button>
        </div>
      </div>
    </div>
  )
}