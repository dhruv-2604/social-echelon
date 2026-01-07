'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import {
  FileText,
  ArrowLeft,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Trash2,
  MessageSquare,
  Loader2,
  ExternalLink,
  Target,
  Package
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Brief {
  id: string
  title: string
  description: string
  campaign_type: string[]
  product_name: string | null
  product_description: string | null
  product_url: string | null
  target_niches: string[]
  target_locations: string[]
  target_audience_age: string[]
  min_followers: number | null
  max_followers: number | null
  min_engagement_rate: number | null
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  content_deadline: string | null
  status: string
  created_at: string
  updated_at: string
}

interface Match {
  id: string
  match_score: number | null
  match_reasons: Record<string, string> | null
  creator_response: string
  response_at: string | null
  decline_reason: string | null
  partnership_status: string
  created_at: string
  profiles: {
    id: string
    full_name: string | null
    instagram_username: string | null
    follower_count: number | null
    engagement_rate: number | null
    niche: string | null
    profile_picture_url: string | null
  }
}

const RESPONSE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  yes: {
    label: 'Interested',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  no: {
    label: 'Declined',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="w-4 h-4" />
  },
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-4 h-4" />
  },
  maybe: {
    label: 'Maybe',
    color: 'bg-blue-100 text-blue-700',
    icon: <Clock className="w-4 h-4" />
  }
}

export default function BriefDetailPage({ params }: { params: Promise<{ briefId: string }> }) {
  const { briefId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchBriefDetails()
  }, [briefId])

  async function fetchBriefDetails() {
    try {
      const response = await fetch(`/api/brand/briefs/${briefId}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        if (response.status === 404) {
          router.push('/brand/dashboard/briefs')
          return
        }
        throw new Error('Failed to fetch brief')
      }

      const data = await response.json()
      setBrief(data.brief)
      setMatches(data.matches || [])
    } catch (err) {
      console.error('Error fetching brief:', err)
    } finally {
      setLoading(false)
    }
  }

  async function updateBriefStatus(status: string) {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/brand/briefs/${briefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setBrief(prev => prev ? { ...prev, status } : null)
      }
    } catch (err) {
      console.error('Error updating brief:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  async function deleteBrief() {
    if (!confirm('Are you sure you want to cancel this brief?')) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/brand/briefs/${briefId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/brand/dashboard/briefs')
      }
    } catch (err) {
      console.error('Error deleting brief:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Budget TBD'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return 'Budget TBD'
  }

  const formatFollowers = (count: number | null) => {
    if (!count) return 'N/A'
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading brief details...</p>
        </motion.div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WellnessCard className="p-8 text-center">
          <h2 className="text-xl font-medium text-gray-800 mb-2">Brief not found</h2>
          <p className="text-gray-600 mb-4">This brief may have been deleted.</p>
          <Link href="/brand/dashboard/briefs">
            <WellnessButton variant="secondary">Back to Briefs</WellnessButton>
          </Link>
        </WellnessCard>
      </div>
    )
  }

  const interestedCount = matches.filter(m => m.creator_response === 'yes').length
  const pendingCount = matches.filter(m => m.creator_response === 'pending').length

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link
          href="/brand/dashboard/briefs"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Briefs</span>
        </Link>

        {/* Brief Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <WellnessCard className="p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-display font-light text-gray-800">
                    {brief.title}
                  </h1>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    brief.status === 'active' && "bg-green-100 text-green-700",
                    brief.status === 'paused' && "bg-yellow-100 text-yellow-700",
                    brief.status === 'completed' && "bg-blue-100 text-blue-700",
                    brief.status === 'cancelled' && "bg-gray-100 text-gray-600"
                  )}>
                    {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Created {formatDate(brief.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {brief.status === 'active' && (
                  <WellnessButton
                    variant="secondary"
                    size="sm"
                    onClick={() => updateBriefStatus('paused')}
                    disabled={isUpdating}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </WellnessButton>
                )}
                {brief.status === 'paused' && (
                  <WellnessButton
                    variant="secondary"
                    size="sm"
                    onClick={() => updateBriefStatus('active')}
                    disabled={isUpdating}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </WellnessButton>
                )}
                {brief.status !== 'cancelled' && brief.status !== 'completed' && (
                  <WellnessButton
                    variant="secondary"
                    size="sm"
                    onClick={deleteBrief}
                    disabled={isUpdating}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Cancel
                  </WellnessButton>
                )}
              </div>
            </div>

            <p className="text-gray-700 mb-6">{brief.description}</p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Content Types</p>
                <p className="font-medium text-gray-800">{brief.campaign_type.join(', ')}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Budget</p>
                <p className="font-medium text-gray-800">{formatBudget(brief.budget_min, brief.budget_max)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Interested</p>
                <p className="font-medium text-gray-800">{interestedCount} creators</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Pending</p>
                <p className="font-medium text-gray-800">{pendingCount} responses</p>
              </div>
            </div>
          </WellnessCard>
        </motion.div>

        {/* Product Info (if available) */}
        {brief.product_name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <WellnessCard className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-pink-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-800">Product Information</h2>
              </div>
              <div className="space-y-3">
                <p><span className="text-gray-500">Name:</span> {brief.product_name}</p>
                {brief.product_description && (
                  <p><span className="text-gray-500">Description:</span> {brief.product_description}</p>
                )}
                {brief.product_url && (
                  <a
                    href={brief.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700"
                  >
                    View Product <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </WellnessCard>
          </motion.div>
        )}

        {/* Target Criteria */}
        {(brief.target_niches.length > 0 || brief.min_followers || brief.max_followers) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <WellnessCard className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-800">Target Criteria</h2>
              </div>
              <div className="space-y-3">
                {brief.target_niches.length > 0 && (
                  <div>
                    <span className="text-gray-500">Niches:</span>{' '}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {brief.target_niches.map(niche => (
                        <span key={niche} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {niche}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(brief.min_followers || brief.max_followers) && (
                  <p>
                    <span className="text-gray-500">Follower Range:</span>{' '}
                    {formatFollowers(brief.min_followers)} - {formatFollowers(brief.max_followers)}
                  </p>
                )}
                {brief.min_engagement_rate && (
                  <p>
                    <span className="text-gray-500">Min Engagement:</span> {brief.min_engagement_rate}%
                  </p>
                )}
              </div>
            </WellnessCard>
          </motion.div>
        )}

        {/* Creator Responses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <WellnessCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-800">Creator Responses</h2>
              </div>
              <span className="text-sm text-gray-500">{matches.length} total matches</span>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-2">No creator matches yet</p>
                <p className="text-sm text-gray-500">
                  Creators will appear here once they&apos;re matched to your brief
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => {
                  const responseConfig = RESPONSE_CONFIG[match.creator_response] || RESPONSE_CONFIG.pending
                  return (
                    <div
                      key={match.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          {match.profiles.profile_picture_url ? (
                            <img
                              src={match.profiles.profile_picture_url}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="w-6 h-6 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {match.profiles.full_name || match.profiles.instagram_username || 'Creator'}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            {match.profiles.instagram_username && (
                              <span>@{match.profiles.instagram_username}</span>
                            )}
                            {match.profiles.follower_count && (
                              <span>{formatFollowers(match.profiles.follower_count)} followers</span>
                            )}
                            {match.profiles.niche && (
                              <span>{match.profiles.niche}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                          responseConfig.color
                        )}>
                          {responseConfig.icon}
                          {responseConfig.label}
                        </span>
                        {match.creator_response === 'yes' && (
                          <WellnessButton variant="secondary" size="sm">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Message
                          </WellnessButton>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </WellnessCard>
        </motion.div>
      </div>
    </div>
  )
}
