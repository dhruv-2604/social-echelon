'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Instagram, Bell, CreditCard, Shield, HelpCircle, LogOut, Save, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AlertBell from '@/components/alerts/alert-bell'

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

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
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
      alert('Profile updated successfully!')
    } catch (err) {
      alert('Failed to update profile')
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

      // Also generate new content plan with updated preferences
      const planResponse = await fetch('/api/ai/generate-content-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: profile?.id,
          preferences
        })
      })

      if (!planResponse.ok) {
        console.error('Failed to generate new content plan')
      }

      alert('Preferences saved successfully! A new content plan has been generated.')
    } catch (err) {
      alert('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      router.push('/')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SE</span>
                </div>
                <span className="font-bold text-xl text-gray-900">Social Echelon</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <a href="/intelligence" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors">
                Intelligence
              </a>
              <a href="/algorithm" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors">
                Algorithm
              </a>
              <a href="/trends" className="text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors">
                Trends
              </a>
              <AlertBell />
              <img 
                src={profile?.avatar_url || '/default-avatar.png'} 
                alt={profile?.full_name || 'Profile'} 
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64">
            <nav className="space-y-1">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'preferences', label: 'Content Preferences', icon: Instagram },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
                { id: 'privacy', label: 'Privacy & Security', icon: Shield },
                { id: 'help', label: 'Help & Support', icon: HelpCircle }
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-purple-50 text-purple-600'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 mt-8 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram Account
                      </label>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <Instagram className="w-5 h-5 text-pink-500" />
                        <span className="text-gray-700">@{profile?.instagram_username}</span>
                        <span className="ml-auto text-sm text-gray-500">Connected</span>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Content Preferences</h2>
                  
                  <div className="space-y-6">
                    {/* Niche */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Niche
                      </label>
                      <select
                        value={preferences.niche}
                        onChange={(e) => setPreferences({ ...preferences, niche: e.target.value })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
                        Primary Goal
                      </label>
                      <select
                        value={preferences.primary_goal}
                        onChange={(e) => setPreferences({ ...preferences, primary_goal: e.target.value as any })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      >
                        <option value="growth">Grow Followers</option>
                        <option value="engagement">Boost Engagement</option>
                        <option value="brand_partnerships">Brand Partnerships</option>
                        <option value="sales">Drive Sales</option>
                      </select>
                    </div>

                    {/* Content Style */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Style
                      </label>
                      <select
                        value={preferences.content_style}
                        onChange={(e) => setPreferences({ ...preferences, content_style: e.target.value as any })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      >
                        <option value="educational">Educational</option>
                        <option value="entertaining">Entertaining</option>
                        <option value="aspirational">Aspirational</option>
                        <option value="authentic">Authentic</option>
                      </select>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={preferences.target_audience}
                        onChange={(e) => setPreferences({ ...preferences, target_audience: e.target.value })}
                        placeholder="e.g., young professionals, moms, fitness enthusiasts"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    {/* Voice Tone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Tone
                      </label>
                      <select
                        value={preferences.voice_tone}
                        onChange={(e) => setPreferences({ ...preferences, voice_tone: e.target.value as any })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="inspirational">Inspirational</option>
                        <option value="humorous">Humorous</option>
                      </select>
                    </div>

                    {/* Posting Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Posts per Week: {preferences.posting_frequency}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="7"
                        value={preferences.posting_frequency}
                        onChange={(e) => setPreferences({ ...preferences, posting_frequency: parseInt(e.target.value) })}
                        className="w-full accent-purple-600"
                      />
                    </div>

                    <button
                      onClick={handleSavePreferences}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Notification Settings</h2>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'algorithm', label: 'Algorithm Changes', desc: 'Get notified when Instagram algorithm changes are detected' },
                      { id: 'trends', label: 'Trending Topics', desc: 'Weekly digest of trending topics in your niche' },
                      { id: 'partnerships', label: 'Brand Opportunities', desc: 'New brand partnership matches' },
                      { id: 'performance', label: 'Performance Updates', desc: 'Weekly performance reports' }
                    ].map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{notification.label}</div>
                          <div className="text-sm text-gray-600">{notification.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Billing & Plans</h2>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {profile?.subscription_tier === 'pro' ? 'Pro Manager Plan' : 'Growth Starter Plan'}
                          </h3>
                          <p className="text-gray-600">
                            {profile?.subscription_tier === 'pro' ? '$49/month' : '$19/month'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          profile?.subscription_status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {profile?.subscription_status || 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <span>✓</span>
                          <span>AI-generated content plans</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>✓</span>
                          <span>Real-time trend monitoring</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>✓</span>
                          <span>Algorithm change detection</span>
                        </div>
                        {profile?.subscription_tier === 'pro' && (
                          <>
                            <div className="flex items-center space-x-2">
                              <span>✓</span>
                              <span>Advanced brand matching</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span>✓</span>
                              <span>1:1 monthly strategy calls</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {profile?.subscription_tier !== 'pro' && (
                      <button className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Privacy & Security</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Instagram Permissions</h3>
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          Social Echelon has access to your Instagram Business Account data including posts, insights, and basic profile information. 
                          This data is used solely to provide personalized content recommendations and analytics.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Data Usage</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li>• Your data is never shared with third parties</li>
                        <li>• All data is encrypted in transit and at rest</li>
                        <li>• You can request data deletion at any time</li>
                        <li>• We comply with GDPR and privacy regulations</li>
                      </ul>
                    </div>

                    <div className="border-t pt-6">
                      <button className="text-red-600 hover:text-red-700 font-medium">
                        Delete My Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'help' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Help & Support</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Get Help</h3>
                      <div className="space-y-3">
                        <a href="#" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                          <div className="font-medium text-gray-900">Documentation</div>
                          <div className="text-sm text-gray-600">Learn how to use Social Echelon</div>
                        </a>
                        <a href="#" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                          <div className="font-medium text-gray-900">FAQs</div>
                          <div className="text-sm text-gray-600">Find answers to common questions</div>
                        </a>
                        <a href="mailto:support@socialechelon.com" className="block p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
                          <div className="font-medium text-gray-900">Email Support</div>
                          <div className="text-sm text-gray-600">support@socialechelon.com</div>
                        </a>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Feature Requests</h3>
                      <p className="text-sm text-gray-600">
                        Have an idea for a new feature? We'd love to hear from you! Send your suggestions to feedback@socialechelon.com
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}