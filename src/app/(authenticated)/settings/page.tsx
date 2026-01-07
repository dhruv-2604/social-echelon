'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Palette,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Check,
  Loader2,
  Moon,
  Sun,
  Zap,
  Heart,
  Sparkles,
  Clock,
  Target,
  Feather,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Coffee,
  Handshake,
  DollarSign,
  Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  instagram_username: string | null
  avatar_url: string | null
  follower_count: number | null
  following_count: number | null
  posts_count: number | null
  engagement_rate: number | null
  niche: string | null
  subscription_tier: 'basic' | 'pro' | null
  subscription_status: 'active' | 'inactive' | 'cancelled' | null
}

interface UserPreferences {
  niche: string
  primary_goal: 'growth' | 'engagement' | 'brand_partnerships' | 'sales'
  content_style: 'educational' | 'entertaining' | 'aspirational' | 'authentic'
  target_audience: string
  voice_tone: 'professional' | 'casual' | 'inspirational' | 'humorous'
  posting_frequency: number
}

interface PartnershipAvailability {
  actively_seeking: boolean
  partnership_capacity: number
  current_partnerships: number
  min_budget: number
  preferred_campaign_types: string[]
}

const CAMPAIGN_TYPES = [
  { id: 'sponsored_post', label: 'Sponsored Posts', icon: '📸' },
  { id: 'story', label: 'Stories', icon: '📱' },
  { id: 'reel', label: 'Reels', icon: '🎬' },
  { id: 'ugc', label: 'UGC', icon: '✨' },
  { id: 'ambassador', label: 'Ambassador', icon: '🤝' },
  { id: 'event', label: 'Events', icon: '🎉' }
]

export default function BoundariesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('energy')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>({
    niche: 'lifestyle',
    primary_goal: 'growth',
    content_style: 'authentic',
    target_audience: '',
    voice_tone: 'casual',
    posting_frequency: 3
  })
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  })
  const [vacationMode, setVacationMode] = useState(false)
  const [quietHours, setQuietHours] = useState({ enabled: true, start: '21:00', end: '09:00' })
  const [weekendMode, setWeekendMode] = useState(true)
  const [availability, setAvailability] = useState<PartnershipAvailability>({
    actively_seeking: true,
    partnership_capacity: 3,
    current_partnerships: 0,
    min_budget: 100,
    preferred_campaign_types: []
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  async function fetchUserData() {
    try {
      const response = await fetch('/api/user/profile')
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/')
          return
        }
        throw new Error('Failed to fetch profile')
      }
      
      const data = await response.json()
      setProfile(data.profile)
      setProfileForm({
        full_name: data.profile.full_name || '',
        email: data.profile.email
      })

      // Fetch existing preferences
      const prefsResponse = await fetch('/api/user/preferences')
      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json()
        if (prefsData.preferences) {
          setPreferences({
            niche: prefsData.preferences.niche || 'lifestyle',
            primary_goal: prefsData.preferences.primary_goal || 'growth',
            content_style: prefsData.preferences.content_style || 'authentic',
            target_audience: prefsData.preferences.target_audience || '',
            voice_tone: prefsData.preferences.voice_tone || 'casual',
            posting_frequency: prefsData.preferences.posting_frequency || 3
          })
        }
      }

      // Fetch availability settings from profile
      if (data.profile) {
        setAvailability({
          actively_seeking: data.profile.actively_seeking ?? true,
          partnership_capacity: data.profile.partnership_capacity ?? 3,
          current_partnerships: data.profile.current_partnerships ?? 0,
          min_budget: data.profile.min_budget ?? 100,
          preferred_campaign_types: data.profile.preferred_campaign_types ?? []
        })
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: profileForm.full_name,
          email: profileForm.email
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const data = await response.json()
      setProfile(data.profile)
    } catch (err) {
      console.error('Failed to update profile:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePreferences() {
    setSaving(true)
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }
      
      // Generate new content plan in the background
      fetch('/api/ai/generate-content-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: profile?.id,
          ...preferences
        })
      })

    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAvailability() {
    setSaving(true)
    try {
      const response = await fetch('/api/creator/availability', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(availability)
      })

      if (!response.ok) {
        throw new Error('Failed to save availability')
      }
    } catch (err) {
      console.error('Failed to save availability:', err)
    } finally {
      setSaving(false)
    }
  }

  function toggleCampaignType(typeId: string) {
    setAvailability(prev => ({
      ...prev,
      preferred_campaign_types: prev.preferred_campaign_types.includes(typeId)
        ? prev.preferred_campaign_types.filter(t => t !== typeId)
        : [...prev.preferred_campaign_types, typeId]
    }))
  }

  async function handleLogout() {
    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-600">Setting up your space...</p>
        </motion.div>
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-light text-gray-800 mb-4">
            Your Boundaries
          </h1>
          <p className="text-gray-600 text-lg">
            Create space for what matters most
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          className="flex justify-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="inline-flex gap-2 p-1 bg-white/80 backdrop-blur rounded-full border border-gray-200/50">
            {[
              { id: 'energy', label: 'Energy', icon: Zap },
              { id: 'partnerships', label: 'Partnerships', icon: Handshake },
              { id: 'focus', label: 'Focus', icon: Target },
              { id: 'peace', label: 'Peace', icon: Heart },
              { id: 'identity', label: 'Identity', icon: User },
              { id: 'protection', label: 'Protection', icon: Shield }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'energy' && (
            <motion.div
              key="energy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Vacation Mode */}
              <WellnessCard glow={vacationMode}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      Vacation Mode
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Take a complete break. We'll handle everything while you recharge.
                    </p>
                    {vacationMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-green-50 rounded-lg"
                      >
                        <p className="text-green-700 text-sm">
                          🌴 Vacation mode active! All automated posting is running. Enjoy your time off!
                        </p>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={() => setVacationMode(!vacationMode)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      vacationMode ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        vacationMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </WellnessCard>

              {/* Quiet Hours */}
              <WellnessCard>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      Quiet Hours
                    </h3>
                    <p className="text-gray-600">
                      No notifications during your rest time
                    </p>
                  </div>
                  <button
                    onClick={() => setQuietHours({ ...quietHours, enabled: !quietHours.enabled })}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      quietHours.enabled ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        quietHours.enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {quietHours.enabled && (
                  <div className="flex gap-4 items-center">
                    <Moon className="w-5 h-5 text-purple-500" />
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-gray-700"
                    />
                    <span className="text-gray-500">to</span>
                    <Sun className="w-5 h-5 text-yellow-500" />
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-gray-700"
                    />
                  </div>
                )}
              </WellnessCard>

              {/* Weekend Mode */}
              <WellnessCard>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      Weekend Sanctuary
                    </h3>
                    <p className="text-gray-600">
                      Weekends are yours. We'll pause all non-essential activities.
                    </p>
                  </div>
                  <button
                    onClick={() => setWeekendMode(!weekendMode)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      weekendMode ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        weekendMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </WellnessCard>
            </motion.div>
          )}

          {activeTab === 'partnerships' && (
            <motion.div
              key="partnerships"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Availability Toggle */}
              <WellnessCard glow={availability.actively_seeking}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      Open for Partnerships
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Let brands know you're actively looking for collaborations
                    </p>
                    {availability.actively_seeking && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-green-50 rounded-lg"
                      >
                        <p className="text-green-700 text-sm">
                          You're visible to brands looking for creators like you
                        </p>
                      </motion.div>
                    )}
                  </div>
                  <button
                    onClick={() => setAvailability({ ...availability, actively_seeking: !availability.actively_seeking })}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      availability.actively_seeking ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        availability.actively_seeking ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </WellnessCard>

              {/* Capacity */}
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-4">
                  Partnership Capacity
                </h3>
                <p className="text-gray-600 mb-6">
                  How many brand partnerships can you comfortably handle per month?
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current: {availability.current_partnerships} active</span>
                    <span className="text-lg font-medium text-purple-600">{availability.partnership_capacity} max/month</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={availability.partnership_capacity}
                    onChange={(e) => setAvailability({ ...availability, partnership_capacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Deep Focus (1)</span>
                    <span>Balanced (3-5)</span>
                    <span>Very Active (10)</span>
                  </div>
                </div>
              </WellnessCard>

              {/* Minimum Budget */}
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-4">
                  Minimum Budget
                </h3>
                <p className="text-gray-600 mb-6">
                  Only show you opportunities at or above this rate
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={availability.min_budget}
                      onChange={(e) => setAvailability({ ...availability, min_budget: parseInt(e.target.value) || 0 })}
                      className="w-32 p-3 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-purple-400 focus:outline-none"
                    />
                    <span className="text-gray-600">per campaign</span>
                  </div>
                  <div className="flex gap-2">
                    {[100, 250, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAvailability({ ...availability, min_budget: amount })}
                        className={`px-3 py-1 rounded-full text-sm transition-all ${
                          availability.min_budget === amount
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>
                </div>
              </WellnessCard>

              {/* Preferred Campaign Types */}
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-4">
                  Preferred Campaign Types
                </h3>
                <p className="text-gray-600 mb-6">
                  What kind of content do you enjoy creating?
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CAMPAIGN_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => toggleCampaignType(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        availability.preferred_campaign_types.includes(type.id)
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-sm font-medium text-gray-800">{type.label}</div>
                    </button>
                  ))}
                </div>
              </WellnessCard>

              <WellnessButton
                onClick={handleSaveAvailability}
                disabled={saving}
                variant="calm"
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Availability Settings'}
              </WellnessButton>
            </motion.div>
          )}

          {activeTab === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-6">
                  Content Rhythm
                </h3>
                
                <div className="space-y-6">
                  {/* Posting Frequency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Posts per week: {preferences.posting_frequency}
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={preferences.posting_frequency}
                        onChange={(e) => setPreferences({ ...preferences, posting_frequency: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Minimal</span>
                        <span>Balanced</span>
                        <span>Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Your Voice
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'authentic', label: 'Authentic', icon: Heart },
                        { value: 'educational', label: 'Educational', icon: Coffee },
                        { value: 'entertaining', label: 'Entertaining', icon: Sparkles },
                        { value: 'aspirational', label: 'Aspirational', icon: Zap }
                      ].map((style) => {
                        const Icon = style.icon
                        return (
                          <button
                            key={style.value}
                            onClick={() => setPreferences({ ...preferences, content_style: style.value as any })}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                              preferences.content_style === style.value
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${
                              preferences.content_style === style.value ? 'text-purple-600' : 'text-gray-400'
                            }`} />
                            <span className={`font-medium ${
                              preferences.content_style === style.value ? 'text-purple-700' : 'text-gray-700'
                            }`}>
                              {style.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Primary Goal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Your Intention
                    </label>
                    <select
                      value={preferences.primary_goal}
                      onChange={(e) => setPreferences({ ...preferences, primary_goal: e.target.value as any })}
                      className="w-full p-4 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="growth">Organic Growth</option>
                      <option value="engagement">Deep Connections</option>
                      <option value="brand_partnerships">Meaningful Partnerships</option>
                      <option value="sales">Sustainable Business</option>
                    </select>
                  </div>

                  <WellnessButton 
                    onClick={handleSavePreferences}
                    disabled={saving}
                    variant="calm"
                    className="w-full"
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </WellnessButton>
                </div>
              </WellnessCard>
            </motion.div>
          )}

          {activeTab === 'peace' && (
            <motion.div
              key="peace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-6">
                  Notification Wellness
                </h3>
                
                <div className="space-y-4">
                  {[
                    { 
                      id: 'essential', 
                      label: 'Essential Updates Only', 
                      desc: 'Critical algorithm changes and urgent matters',
                      icon: Bell
                    },
                    { 
                      id: 'weekly', 
                      label: 'Weekly Digest', 
                      desc: 'A calm summary of your progress, delivered Sundays',
                      icon: Clock
                    },
                    { 
                      id: 'opportunities', 
                      label: 'Mindful Opportunities', 
                      desc: 'Curated brand partnerships that align with your values',
                      icon: Sparkles
                    },
                    { 
                      id: 'silence', 
                      label: 'Complete Silence', 
                      desc: 'No notifications. Check when you\'re ready.',
                      icon: VolumeX
                    }
                  ].map((notification) => {
                    const Icon = notification.icon
                    return (
                      <div key={notification.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-4">
                          <Icon className="w-5 h-5 text-purple-500 mt-0.5" />
                          <div>
                            <div className="font-medium text-gray-800">{notification.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{notification.desc}</div>
                          </div>
                        </div>
                        <button
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notification.id === 'weekly' ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notification.id === 'weekly' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </WellnessCard>
            </motion.div>
          )}

          {activeTab === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-6">
                  Your Authentic Self
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className="w-full p-4 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-purple-400 focus:outline-none"
                      placeholder="How you'd like to be known"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Sanctuary
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full p-4 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-purple-400 focus:outline-none"
                      placeholder="Your private space"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Niche
                    </label>
                    <select
                      value={preferences.niche}
                      onChange={(e) => setPreferences({ ...preferences, niche: e.target.value })}
                      className="w-full p-4 bg-white border border-gray-200 rounded-lg text-gray-700 focus:border-purple-400 focus:outline-none"
                    >
                      <option value="lifestyle">Lifestyle</option>
                      <option value="wellness">Wellness & Mindfulness</option>
                      <option value="creativity">Creative Expression</option>
                      <option value="education">Knowledge Sharing</option>
                      <option value="business">Conscious Business</option>
                      <option value="parenting">Mindful Parenting</option>
                      <option value="travel">Slow Travel</option>
                      <option value="food">Nourishment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <WellnessButton 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    variant="calm"
                    className="w-full"
                  >
                    {saving ? 'Saving...' : 'Update Identity'}
                  </WellnessButton>
                </div>
              </WellnessCard>
            </motion.div>
          )}

          {activeTab === 'protection' && (
            <motion.div
              key="protection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <WellnessCard>
                <h3 className="text-xl font-medium text-gray-800 mb-6">
                  Your Safe Space
                </h3>
                
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Your data is sacred. We protect it with enterprise-grade encryption and never share it without your explicit consent.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-700">Two-factor authentication</span>
                      <span className="text-green-600 text-sm font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-700">Data encryption</span>
                      <span className="text-green-600 text-sm font-medium">256-bit AES</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-700">Last security review</span>
                      <span className="text-gray-600 text-sm">2 days ago</span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <button 
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                    >
                      Sign out peacefully
                    </button>
                  </div>
                </div>
              </WellnessCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}