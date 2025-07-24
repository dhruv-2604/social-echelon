'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Instagram, MapPin, Users, TrendingUp, Target, Award,
  Mail, ExternalLink, ChevronRight, Sparkles, Download
} from 'lucide-react'
import Image from 'next/image'

interface CreatorProfile {
  id: string
  instagram_username: string
  full_name: string
  avatar_url: string
  follower_count: number
  engagement_rate: number
  posts_count: number
  bio?: string
  niche?: string
  content_style?: string
  profile_data?: any
  recent_posts?: any[]
  content_pillars?: string[]
  audience_demographics?: {
    topLocations: { city: string; country: string; percentage: number }[]
    ageRanges: { range: string; percentage: number }[]
    genderSplit: { male: number; female: number; other: number }
  }
}

export default function PublicCreatorProfile() {
  const params = useParams()
  const username = params.username as string
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mediaKitDownloading, setMediaKitDownloading] = useState(false)

  useEffect(() => {
    fetchCreatorProfile()
  }, [username])

  async function fetchCreatorProfile() {
    try {
      const response = await fetch(`/api/creator/${username}`)
      if (response.ok) {
        const data = await response.json()
        setCreator(data.creator)
      }
    } catch (error) {
      console.error('Error fetching creator profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function downloadMediaKit() {
    setMediaKitDownloading(true)
    try {
      const response = await fetch(`/api/creator/${username}/media-kit`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${username}-media-kit.pdf`
        a.click()
      }
    } catch (error) {
      console.error('Error downloading media kit:', error)
    } finally {
      setMediaKitDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading creator profile...</p>
        </div>
      </div>
    )
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Creator Not Found</h2>
          <p className="text-gray-600">This creator profile doesn't exist.</p>
        </div>
      </div>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SE</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Social Echelon</span>
            </div>
            
            <div className="text-sm text-gray-600">
              Creator Profile
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <img
                src={creator.avatar_url || '/default-avatar.png'}
                alt={creator.full_name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full">
                <Instagram className="w-5 h-5" />
              </div>
            </div>

            {/* Basic Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold mb-2">{creator.full_name}</h1>
              <p className="text-xl mb-4 opacity-90">@{creator.instagram_username}</p>
              
              {/* Stats */}
              <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                <div>
                  <div className="text-2xl font-bold">{formatNumber(creator.follower_count)}</div>
                  <div className="text-sm opacity-80">Followers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{creator.engagement_rate}%</div>
                  <div className="text-sm opacity-80">Engagement</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{creator.posts_count}</div>
                  <div className="text-sm opacity-80">Posts</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                <a
                  href={`https://instagram.com/${creator.instagram_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <Instagram className="w-4 h-4" />
                  <span>View Instagram</span>
                </a>
                <button
                  onClick={downloadMediaKit}
                  disabled={mediaKitDownloading}
                  className="px-6 py-2 bg-purple-800 text-white rounded-lg font-medium hover:bg-purple-900 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{mediaKitDownloading ? 'Downloading...' : 'Download Media Kit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* About */}
        {creator.bio && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700">{creator.bio}</p>
          </div>
        )}

        {/* Content Focus */}
        {creator.profile_data?.identity && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Content Focus</h2>
            
            {/* Content Pillars */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Main Topics</h3>
              <div className="flex flex-wrap gap-2">
                {creator.profile_data.identity.contentPillars?.map((pillar: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {pillar}
                  </span>
                ))}
              </div>
            </div>

            {/* Style */}
            {creator.profile_data.identity.contentStyle && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Content Style</h3>
                  <p className="text-gray-900">{creator.profile_data.identity.contentStyle.primaryFormat}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Aesthetic</h3>
                  <p className="text-gray-900">
                    {creator.profile_data.identity.contentStyle.aestheticKeywords?.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audience Demographics */}
        {creator.profile_data?.analytics?.audienceDemographics && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Audience Analytics</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Age Distribution */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Age Distribution</h3>
                <div className="space-y-2">
                  {creator.profile_data.analytics.audienceDemographics.ageRanges.map((age: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{age.range}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${age.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10 text-right">
                          {age.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gender Split */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Gender Split</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Female</span>
                    <span className="text-sm font-medium text-gray-900">
                      {creator.profile_data.analytics.audienceDemographics.genderSplit.female}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Male</span>
                    <span className="text-sm font-medium text-gray-900">
                      {creator.profile_data.analytics.audienceDemographics.genderSplit.male}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Other</span>
                    <span className="text-sm font-medium text-gray-900">
                      {creator.profile_data.analytics.audienceDemographics.genderSplit.other}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Locations */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Top Locations</h3>
                <div className="space-y-2">
                  {creator.profile_data.analytics.audienceDemographics.topLocations
                    .slice(0, 3)
                    .map((location: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {location.city ? `${location.city}, ` : ''}{location.country}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{location.percentage}%</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Performance */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{creator.engagement_rate}%</div>
              <div className="text-sm text-gray-600">Avg Engagement</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <Users className="w-8 h-8 text-pink-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(Math.round(creator.follower_count * creator.engagement_rate / 100))}
              </div>
              <div className="text-sm text-gray-600">Avg Reach</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{creator.posts_count}</div>
              <div className="text-sm text-gray-600">Total Posts</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">Verified</div>
              <div className="text-sm text-gray-600">Creator</div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Want to Partner with {creator.full_name}?</h2>
          <p className="mb-6 opacity-90">
            Join Social Echelon for free to connect with this creator and thousands more.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/brand-signup"
              className="px-8 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <span>Sign Up as a Brand</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="/"
              className="px-8 py-3 bg-purple-800 text-white rounded-lg font-medium hover:bg-purple-900 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-gray-600">
          <p>This creator profile is powered by Social Echelon</p>
          <p className="mt-2">
            The free platform connecting creators and brands • No fees • No commissions
          </p>
        </div>
      </div>
    </div>
  )
}