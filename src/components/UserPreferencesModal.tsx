'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { WellnessButton } from './wellness/WellnessButton'
import { cn } from '@/lib/utils'

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
    <div className="fixed inset-0 bg-wellness-neutral-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-wellness-xl border border-white/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-wellness-neutral-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <h2 className="text-2xl font-display font-bold text-wellness-neutral-900">Content Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-wellness-neutral-100 rounded-full transition-colors text-wellness-neutral-500 hover:text-wellness-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Niche */}
          <div>
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
              What's your niche?
            </label>
            <select
              value={preferences.niche}
              onChange={(e) => setPreferences({ ...preferences, niche: e.target.value })}
              className="w-full p-3 bg-wellness-neutral-100 border-transparent rounded-xl focus:ring-2 focus:ring-wellness-purple focus:bg-white transition-all"
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
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
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
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all duration-200",
                    preferences.primary_goal === goal.value
                      ? "border-wellness-purple bg-wellness-purple-light/30 ring-1 ring-wellness-purple"
                      : "border-wellness-neutral-200 hover:border-wellness-purple-soft hover:bg-wellness-neutral-100/50"
                  )}
                >
                  <div className={cn(
                    "font-medium mb-1",
                    preferences.primary_goal === goal.value ? "text-wellness-purple" : "text-wellness-neutral-900"
                  )}>{goal.label}</div>
                  <div className="text-xs text-wellness-neutral-500">{goal.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Style */}
          <div>
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
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
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all duration-200",
                    preferences.content_style === style.value
                      ? "border-wellness-purple bg-wellness-purple-light/30 ring-1 ring-wellness-purple"
                      : "border-wellness-neutral-200 hover:border-wellness-purple-soft hover:bg-wellness-neutral-100/50"
                  )}
                >
                  <div className={cn(
                    "font-medium mb-1",
                    preferences.content_style === style.value ? "text-wellness-purple" : "text-wellness-neutral-900"
                  )}>{style.label}</div>
                  <div className="text-xs text-wellness-neutral-500">{style.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-2">
              Who's your target audience?
            </label>
            <input
              type="text"
              value={preferences.target_audience}
              onChange={(e) => setPreferences({ ...preferences, target_audience: e.target.value })}
              placeholder="e.g., young professionals, moms, fitness enthusiasts"
              className="w-full p-3 bg-wellness-neutral-100 border-transparent rounded-xl focus:ring-2 focus:ring-wellness-purple focus:bg-white transition-all placeholder:text-wellness-neutral-300"
            />
          </div>

          {/* Voice Tone */}
          <div>
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-3">
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
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all text-sm font-medium",
                    preferences.voice_tone === tone.value
                      ? "border-wellness-purple bg-wellness-purple-light/30 text-wellness-purple ring-1 ring-wellness-purple"
                      : "border-wellness-neutral-200 hover:border-wellness-purple-soft hover:bg-wellness-neutral-100/50 text-wellness-neutral-700"
                  )}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Posting Frequency */}
          <div>
            <label className="block text-sm font-medium text-wellness-neutral-700 mb-4">
              How often do you want to post per week?
            </label>
            <div className="flex items-center space-x-6 p-4 bg-wellness-neutral-100 rounded-xl">
              <input
                type="range"
                min="1"
                max="7"
                value={preferences.posting_frequency}
                onChange={(e) => setPreferences({ ...preferences, posting_frequency: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-wellness-neutral-200 rounded-lg appearance-none cursor-pointer accent-wellness-purple"
              />
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm min-w-[4rem] text-center">
                <span className="text-xl font-bold text-wellness-purple">
                  {preferences.posting_frequency}
                </span>
                <span className="text-xs text-wellness-neutral-500 block">
                  {preferences.posting_frequency === 1 ? 'post' : 'posts'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-wellness-neutral-100 bg-wellness-neutral-100/50">
          <WellnessButton
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </WellnessButton>
          <WellnessButton
            variant="primary"
            onClick={handleSave}
            disabled={!preferences.target_audience.trim()}
          >
            Generate Content Plan
          </WellnessButton>
        </div>
      </div>
    </div>
  )
}