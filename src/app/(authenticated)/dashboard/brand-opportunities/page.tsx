'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Filter, DollarSign, TrendingUp, Users, Target,
  ChevronRight, Mail, Instagram, ExternalLink, Sparkles,
  Heart, AlertCircle, Clock, CheckCircle, Flower2, TreePine,
  Leaf, MapPin, Send, Inbox, ArrowUpRight, X, CalendarDays,
  Building2, Tag, Eye, ThumbsUp, ThumbsDown, HelpCircle,
  FileCheck, Star, Upload, CreditCard, MessageSquare
} from 'lucide-react'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'

// Tab type
type TabType = 'incoming' | 'active'

// Incoming brief opportunity from API
interface IncomingOpportunity {
  id: string
  briefId: string
  matchScore: number
  matchReasons: {
    nicheMatch: boolean
    followerMatch: boolean
    engagementMatch: boolean
    budgetMatch: boolean
    campaignTypeMatch: boolean
  }
  creatorResponse: string
  responseAt: string | null
  partnershipStatus: string
  createdAt: string
  brief: {
    id: string
    title: string
    description: string
    campaignType: string[]
    productName: string | null
    productDescription: string | null
    targetNiches: string[]
    minFollowers: number | null
    maxFollowers: number | null
    minEngagementRate: number | null
    budgetMin: number | null
    budgetMax: number | null
    deadline: string | null
    contentDeadline: string | null
    status: string
  } | null
  brand: {
    companyName: string
    logoUrl: string | null
    website: string | null
    industry: string | null
  } | null
}

interface OpportunityCounts {
  pending: number
  yes: number
  no: number
  total: number
}

// Active partnership from partnerships API
interface Deliverable {
  id: string
  type: 'post' | 'story' | 'reel' | 'ugc' | 'other'
  description?: string
  quantity: number
  completed: number
  dueDate?: string
}

type PartnershipStatus = 'negotiating' | 'active' | 'content_pending' | 'review' | 'completed' | 'cancelled'

interface ActivePartnership {
  id: string
  briefMatchId: string | null
  brandUserId: string
  creatorUserId: string
  agreedRate: number | null
  deliverables: Deliverable[]
  status: PartnershipStatus
  contentSubmittedAt: string | null
  contentApprovedAt: string | null
  paymentSentAt: string | null
  completedAt: string | null
  brandRating: number | null
  creatorRating: number | null
  wellnessNotes: string | null
  createdAt: string
  updatedAt: string
  relayEmail?: string
  brand?: {
    companyName: string
    logoUrl?: string
    website?: string
    industry?: string
  }
  brief?: {
    title: string
    campaignType: string[]
  }
  health?: {
    overallScore: number
    responsiveness: number
    deliveryRate: number
    paymentReliability: number
  }
}

interface PartnershipStats {
  total: number
  active: number
  completed: number
  cancelled: number
  avgRating: number | null
}


const getCategoryColor = (category: string) => {
  switch (category) {
    case 'excellent': return 'from-pink-400 to-purple-400'
    case 'good': return 'from-blue-400 to-green-400'
    case 'fair': return 'from-yellow-400 to-orange-400'
    case 'poor': return 'from-gray-300 to-gray-400'
    default: return 'from-gray-300 to-gray-400'
  }
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'excellent': return <Flower2 className="w-5 h-5 text-pink-500" />
    case 'good': return <TreePine className="w-5 h-5 text-green-500" />
    case 'fair': return <Leaf className="w-5 h-5 text-yellow-500" />
    default: return <Sparkles className="w-5 h-5 text-gray-500" />
  }
}

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'excellent': return 'In Full Bloom'
    case 'good': return 'Growing Strong'
    case 'fair': return 'New Seedling'
    case 'poor': return 'Early Stage'
    default: return 'Exploring'
  }
}

const getMatchScoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-blue-100 text-blue-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-700'
}

const formatBudget = (min: number | null, max: number | null) => {
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
  if (min) return `From $${min.toLocaleString()}`
  if (max) return `Up to $${max.toLocaleString()}`
  return 'Budget TBD'
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const campaignTypeLabels: Record<string, string> = {
  post: 'Feed Post',
  story: 'Story',
  reel: 'Reel',
  ugc: 'UGC',
  review: 'Review',
  unboxing: 'Unboxing'
}

export default function BrandOpportunities() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('incoming')

  // Incoming briefs state
  const [incomingOpportunities, setIncomingOpportunities] = useState<IncomingOpportunity[]>([])
  const [opportunityCounts, setOpportunityCounts] = useState<OpportunityCounts>({ pending: 0, yes: 0, no: 0, total: 0 })
  const [incomingLoading, setIncomingLoading] = useState(true)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingOpportunity | null>(null)

  // Active partnerships state
  const [partnerships, setPartnerships] = useState<ActivePartnership[]>([])
  const [partnershipStats, setPartnershipStats] = useState<PartnershipStats | null>(null)
  const [partnershipsLoading, setPartnershipsLoading] = useState(true)
  const [selectedPartnership, setSelectedPartnership] = useState<ActivePartnership | null>(null)
  const [submittingContent, setSubmittingContent] = useState<string | null>(null)
  const [ratingPartnership, setRatingPartnership] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState<number>(5)

  useEffect(() => {
    fetchIncomingOpportunities()
    fetchPartnerships()
  }, [])

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedIncoming) setSelectedIncoming(null)
        if (selectedPartnership) setSelectedPartnership(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedIncoming, selectedPartnership])

  async function fetchIncomingOpportunities() {
    try {
      const res = await fetch('/api/creator/opportunities')
      if (res.ok) {
        const data = await res.json()
        setIncomingOpportunities(data.opportunities || [])
        setOpportunityCounts(data.counts || { pending: 0, yes: 0, no: 0, total: 0 })
      }
    } catch (error) {
      console.error('Error fetching incoming opportunities:', error)
    } finally {
      setIncomingLoading(false)
    }
  }

  async function handleRespond(matchId: string, response: 'yes' | 'no' | 'maybe') {
    setRespondingTo(matchId)
    try {
      const res = await fetch(`/api/creator/opportunities/${matchId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      })

      if (res.ok) {
        // Refresh opportunities
        await fetchIncomingOpportunities()
        setSelectedIncoming(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit response')
      }
    } catch (error) {
      console.error('Error responding to opportunity:', error)
      alert('Failed to submit response')
    } finally {
      setRespondingTo(null)
    }
  }

  async function fetchPartnerships() {
    try {
      const res = await fetch('/api/creator/partnerships')
      if (res.ok) {
        const data = await res.json()
        setPartnerships(data.partnerships || [])
        setPartnershipStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching partnerships:', error)
    } finally {
      setPartnershipsLoading(false)
    }
  }

  async function handleSubmitContent(partnershipId: string) {
    setSubmittingContent(partnershipId)
    try {
      const res = await fetch(`/api/creator/partnerships/${partnershipId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.ok) {
        await fetchPartnerships()
        setSelectedPartnership(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit content')
      }
    } catch (error) {
      console.error('Error submitting content:', error)
      alert('Failed to submit content')
    } finally {
      setSubmittingContent(null)
    }
  }

  async function handleRatePartnership(partnershipId: string, rating: number) {
    setRatingPartnership(partnershipId)
    try {
      const res = await fetch(`/api/creator/partnerships/${partnershipId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      })

      if (res.ok) {
        await fetchPartnerships()
        setSelectedPartnership(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Error rating partnership:', error)
      alert('Failed to submit rating')
    } finally {
      setRatingPartnership(null)
    }
  }

  const getStatusColor = (status: PartnershipStatus) => {
    switch (status) {
      case 'negotiating': return 'bg-yellow-100 text-yellow-700'
      case 'active': return 'bg-blue-100 text-blue-700'
      case 'content_pending': return 'bg-purple-100 text-purple-700'
      case 'review': return 'bg-indigo-100 text-indigo-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: PartnershipStatus) => {
    switch (status) {
      case 'negotiating': return 'Negotiating'
      case 'active': return 'Active'
      case 'content_pending': return 'Content Submitted'
      case 'review': return 'Under Review'
      case 'completed': return 'Completed'
      case 'cancelled': return 'Cancelled'
      default: return status
    }
  }

  const getStatusGradient = (status: PartnershipStatus) => {
    switch (status) {
      case 'negotiating': return 'from-yellow-400 to-amber-400'
      case 'active': return 'from-blue-400 to-cyan-400'
      case 'content_pending': return 'from-purple-400 to-pink-400'
      case 'review': return 'from-indigo-400 to-purple-400'
      case 'completed': return 'from-green-400 to-emerald-400'
      case 'cancelled': return 'from-red-400 to-orange-400'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  const getDeliverableProgress = (deliverables: Deliverable[]) => {
    if (deliverables.length === 0) return 0
    const totalItems = deliverables.reduce((sum, d) => sum + d.quantity, 0)
    const completedItems = deliverables.reduce((sum, d) => sum + d.completed, 0)
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  }

  const activePartnerships = partnerships.filter(p => !['completed', 'cancelled'].includes(p.status))
  const completedPartnerships = partnerships.filter(p => p.status === 'completed')

  const pendingOpportunities = incomingOpportunities.filter(o => o.creatorResponse === 'pending')
  const acceptedOpportunities = incomingOpportunities.filter(o => o.creatorResponse === 'yes')

  if (incomingLoading && activeTab === 'incoming') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BreathingLoader text="Loading your opportunities..." size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100/50 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Your Partnership Garden</h1>
              <p className="text-gray-600 mt-1">
                Nurture meaningful brand relationships
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-100/80 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'incoming'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Incoming Briefs
              {opportunityCounts.pending > 0 && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {opportunityCounts.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Heart className="w-4 h-4" />
              Active
              {opportunityCounts.yes > 0 && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  {opportunityCounts.yes}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Incoming Briefs Tab */}
        {activeTab === 'incoming' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {pendingOpportunities.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Inbox className="w-12 h-12 text-purple-400" />
                </div>
                <h3 className="text-xl font-light text-gray-900 mb-2">No incoming briefs yet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  When brands create campaigns that match your profile, they'll appear here.
                  Make sure your availability settings are up to date!
                </p>
                <button
                  onClick={() => router.push('/settings?tab=partnerships')}
                  className="mt-6 px-6 py-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Update Availability Settings →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats Bar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100/50 p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-light text-purple-600">{opportunityCounts.pending}</div>
                      <div className="text-sm text-gray-600">Pending Review</div>
                    </div>
                    <div className="text-center border-x border-gray-100">
                      <div className="text-2xl font-light text-green-600">{opportunityCounts.yes}</div>
                      <div className="text-sm text-gray-600">Accepted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light text-gray-500">{opportunityCounts.total}</div>
                      <div className="text-sm text-gray-600">Total Received</div>
                    </div>
                  </div>
                </div>

                {/* Opportunity Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingOpportunities.map((opportunity, index) => (
                    <motion.div
                      key={opportunity.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100/50 overflow-hidden"
                      onClick={() => setSelectedIncoming(opportunity)}
                    >
                      {/* Match Score Header */}
                      <div className={`h-2 ${
                        opportunity.matchScore >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-400' :
                        opportunity.matchScore >= 60 ? 'bg-gradient-to-r from-blue-400 to-purple-400' :
                        'bg-gradient-to-r from-yellow-400 to-orange-400'
                      }`} />

                      <div className="p-5">
                        {/* Brand Info */}
                        <div className="flex items-start gap-3 mb-4">
                          {opportunity.brand?.logoUrl ? (
                            <img
                              src={opportunity.brand.logoUrl}
                              alt={opportunity.brand.companyName}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {opportunity.brand?.companyName || 'Brand'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {opportunity.brand?.industry || 'Industry'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMatchScoreColor(opportunity.matchScore)}`}>
                            {opportunity.matchScore}% Match
                          </span>
                        </div>

                        {/* Brief Title */}
                        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                          {opportunity.brief?.title || 'Campaign Brief'}
                        </h4>

                        {/* Campaign Types */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(opportunity.brief?.campaignType || []).slice(0, 3).map((type) => (
                            <span
                              key={type}
                              className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
                            >
                              {campaignTypeLabels[type] || type}
                            </span>
                          ))}
                        </div>

                        {/* Budget & Deadline */}
                        <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span>{formatBudget(opportunity.brief?.budgetMin || null, opportunity.brief?.budgetMax || null)}</span>
                          </div>
                          {opportunity.brief?.deadline && (
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(opportunity.brief.deadline)}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRespond(opportunity.id, 'yes')
                            }}
                            disabled={respondingTo === opportunity.id}
                            className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Interested
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedIncoming(opportunity)
                            }}
                            className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-all text-sm"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Active Tab */}
        {activeTab === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {partnershipsLoading ? (
              <div className="flex items-center justify-center py-16">
                <BreathingLoader text="Loading your partnerships..." size="lg" />
              </div>
            ) : partnerships.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="text-xl font-light text-gray-900 mb-2">No partnerships yet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  When you accept incoming briefs, active partnerships will appear here for tracking.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Partnership Stats */}
                {partnershipStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                      <div className="text-2xl font-light text-gray-900">{partnershipStats.active}</div>
                      <div className="text-sm text-gray-600">Active</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                      <div className="text-2xl font-light text-gray-900">{partnershipStats.completed}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                      <div className="text-2xl font-light text-gray-900">{partnershipStats.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="text-2xl font-light text-gray-900">
                          {partnershipStats.avgRating?.toFixed(1) || '-'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">Avg Rating</div>
                    </div>
                  </div>
                )}

                {/* Active Partnerships */}
                {activePartnerships.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Active Partnerships</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activePartnerships.map((partnership, index) => (
                        <motion.div
                          key={partnership.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedPartnership(partnership)}
                        >
                          <div className={`h-2 bg-gradient-to-r ${getStatusGradient(partnership.status)}`} />
                          <div className="p-5">
                            <div className="flex items-start gap-3 mb-4">
                              {partnership.brand?.logoUrl ? (
                                <img
                                  src={partnership.brand.logoUrl}
                                  alt={partnership.brand.companyName}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                                  <Building2 className="w-6 h-6 text-blue-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {partnership.brand?.companyName || 'Brand'}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">
                                  {partnership.brief?.title || 'Campaign'}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(partnership.status)}`}>
                                {getStatusLabel(partnership.status)}
                              </span>
                            </div>

                            {/* Deliverables Progress */}
                            {partnership.deliverables.length > 0 && (
                              <div className="mb-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Deliverables</span>
                                  <span>{getDeliverableProgress(partnership.deliverables)}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500"
                                    style={{ width: `${getDeliverableProgress(partnership.deliverables)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Status Indicators */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {partnership.contentSubmittedAt && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">
                                  <Upload className="w-3 h-3" />
                                  Content Submitted
                                </span>
                              )}
                              {partnership.contentApprovedAt && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded text-xs">
                                  <CheckCircle className="w-3 h-3" />
                                  Approved
                                </span>
                              )}
                              {partnership.paymentSentAt && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs">
                                  <CreditCard className="w-3 h-3" />
                                  Paid
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-600 pt-3 border-t border-gray-100">
                              <span>Started {formatDate(partnership.createdAt)}</span>
                              {partnership.agreedRate && (
                                <span className="font-medium text-green-600">
                                  ${partnership.agreedRate.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Partnerships */}
                {completedPartnerships.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Completed</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {completedPartnerships.map((partnership, index) => (
                        <motion.div
                          key={partnership.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-green-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedPartnership(partnership)}
                        >
                          <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-400" />
                          <div className="p-5">
                            <div className="flex items-start gap-3 mb-3">
                              {partnership.brand?.logoUrl ? (
                                <img
                                  src={partnership.brand.logoUrl}
                                  alt={partnership.brand.companyName}
                                  className="w-10 h-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-green-600" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {partnership.brand?.companyName || 'Brand'}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">
                                  {partnership.brief?.title || 'Campaign'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">
                                Completed {formatDate(partnership.completedAt)}
                              </span>
                              {partnership.brandRating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-medium">{partnership.brandRating}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Incoming Brief Detail Modal */}
      <AnimatePresence>
        {selectedIncoming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedIncoming(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-brief-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedIncoming.brand?.logoUrl ? (
                      <img
                        src={selectedIncoming.brand.logoUrl}
                        alt={selectedIncoming.brand.companyName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <h2 id="incoming-brief-title" className="text-xl font-medium text-gray-900">
                        {selectedIncoming.brand?.companyName || 'Brand'}
                      </h2>
                      <p className="text-gray-600">{selectedIncoming.brand?.industry || ''}</p>
                      {selectedIncoming.brand?.website && (
                        <a
                          href={selectedIncoming.brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIncoming(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Match Score */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getMatchScoreColor(selectedIncoming.matchScore)}`}>
                    {selectedIncoming.matchScore}% Match
                  </div>
                  <div className="text-sm text-gray-600">
                    Based on your profile, niche, and preferences
                  </div>
                </div>

                {/* Brief Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedIncoming.brief?.title}
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {selectedIncoming.brief?.description}
                  </p>
                </div>

                {/* Product Info */}
                {(selectedIncoming.brief?.productName || selectedIncoming.brief?.productDescription) && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">Product Details</h4>
                    {selectedIncoming.brief?.productName && (
                      <p className="text-gray-700 font-medium">{selectedIncoming.brief.productName}</p>
                    )}
                    {selectedIncoming.brief?.productDescription && (
                      <p className="text-gray-600 text-sm mt-1">{selectedIncoming.brief.productDescription}</p>
                    )}
                  </div>
                )}

                {/* Campaign Types */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Content Types Needed</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedIncoming.brief?.campaignType || []).map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium"
                      >
                        {campaignTypeLabels[type] || type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Budget & Timeline */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-medium">Budget</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatBudget(selectedIncoming.brief?.budgetMin || null, selectedIncoming.brief?.budgetMax || null)}
                    </p>
                  </div>
                  {selectedIncoming.brief?.deadline && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <CalendarDays className="w-5 h-5" />
                        <span className="font-medium">Campaign Deadline</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(selectedIncoming.brief.deadline)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Match Reasons */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-3">Why You Matched</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIncoming.matchReasons.nicheMatch && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Niche Alignment
                      </div>
                    )}
                    {selectedIncoming.matchReasons.followerMatch && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Follower Count
                      </div>
                    )}
                    {selectedIncoming.matchReasons.engagementMatch && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Engagement Rate
                      </div>
                    )}
                    {selectedIncoming.matchReasons.budgetMatch && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Budget Match
                      </div>
                    )}
                    {selectedIncoming.matchReasons.campaignTypeMatch && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Campaign Type
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleRespond(selectedIncoming.id, 'yes')}
                    disabled={respondingTo === selectedIncoming.id}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    I'm Interested
                  </button>
                  <button
                    onClick={() => handleRespond(selectedIncoming.id, 'no')}
                    disabled={respondingTo === selectedIncoming.id}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ThumbsDown className="w-5 h-5" />
                    Decline
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partnership Detail Modal */}
      <AnimatePresence>
        {selectedPartnership && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPartnership(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="partnership-detail-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedPartnership.brand?.logoUrl ? (
                      <img
                        src={selectedPartnership.brand.logoUrl}
                        alt={selectedPartnership.brand.companyName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <h2 id="partnership-detail-title" className="text-xl font-medium text-gray-900">
                        {selectedPartnership.brand?.companyName || 'Brand Partnership'}
                      </h2>
                      <p className="text-gray-600">
                        {selectedPartnership.brief?.title || 'Campaign'}
                      </p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedPartnership.status)}`}>
                        {getStatusLabel(selectedPartnership.status)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPartnership(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Partnership Health */}
                {selectedPartnership.health && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-500" />
                      Partnership Health
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Overall Score</div>
                        <div className="text-2xl font-light text-gray-900">
                          {selectedPartnership.health.overallScore}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Responsiveness</div>
                        <div className="text-2xl font-light text-gray-900">
                          {selectedPartnership.health.responsiveness}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deal Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    Deal Details
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Agreed Rate</span>
                      <span className="text-xl font-medium text-green-600">
                        ${selectedPartnership.agreedRate?.toLocaleString() || 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Brand via Email Relay */}
                {selectedPartnership.relayEmail && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-purple-500" />
                      Contact Brand
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Email this address to communicate with the brand. Your email address stays private.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-mono text-purple-700 border border-purple-200 truncate">
                        {selectedPartnership.relayEmail}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedPartnership.relayEmail!)
                          // Could add a toast notification here
                        }}
                        className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                        title="Copy email address"
                      >
                        Copy
                      </button>
                      <a
                        href={`mailto:${selectedPartnership.relayEmail}`}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Email
                      </a>
                    </div>
                  </div>
                )}

                {/* Deliverables */}
                {selectedPartnership.deliverables.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-blue-500" />
                      Deliverables
                    </h3>
                    <div className="space-y-3">
                      {selectedPartnership.deliverables.map((deliverable) => (
                        <div key={deliverable.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-gray-900 capitalize">
                              {deliverable.type}
                            </span>
                            <span className="text-sm text-gray-600">
                              {deliverable.completed}/{deliverable.quantity}
                            </span>
                          </div>
                          {deliverable.description && (
                            <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                          )}
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-purple-400"
                              style={{ width: `${(deliverable.completed / deliverable.quantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Timeline */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Timeline
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">Partnership Started</div>
                        <div className="text-xs text-gray-500">{formatDate(selectedPartnership.createdAt)}</div>
                      </div>
                    </div>
                    {selectedPartnership.contentSubmittedAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Upload className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Content Submitted</div>
                          <div className="text-xs text-gray-500">{formatDate(selectedPartnership.contentSubmittedAt)}</div>
                        </div>
                      </div>
                    )}
                    {selectedPartnership.contentApprovedAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Content Approved</div>
                          <div className="text-xs text-gray-500">{formatDate(selectedPartnership.contentApprovedAt)}</div>
                        </div>
                      </div>
                    )}
                    {selectedPartnership.paymentSentAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Payment Received</div>
                          <div className="text-xs text-gray-500">{formatDate(selectedPartnership.paymentSentAt)}</div>
                        </div>
                      </div>
                    )}
                    {selectedPartnership.completedAt && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Partnership Completed</div>
                          <div className="text-xs text-gray-500">{formatDate(selectedPartnership.completedAt)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rating Section (for completed partnerships) */}
                {selectedPartnership.status === 'completed' && !selectedPartnership.brandRating && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Rate Your Experience
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      How was your experience working with this brand?
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setSelectedRating(star)}
                          className="focus:outline-none"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              star <= selectedRating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleRatePartnership(selectedPartnership.id, selectedRating)}
                      disabled={ratingPartnership === selectedPartnership.id}
                      className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                    >
                      {ratingPartnership === selectedPartnership.id ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                )}

                {/* Display existing rating */}
                {selectedPartnership.brandRating && (
                  <div className="bg-green-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Your Rating
                    </h3>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= selectedPartnership.brandRating!
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-gray-600">({selectedPartnership.brandRating}/5)</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons based on status */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  {selectedPartnership.status === 'active' && (
                    <button
                      onClick={() => handleSubmitContent(selectedPartnership.id)}
                      disabled={submittingContent === selectedPartnership.id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {submittingContent === selectedPartnership.id ? 'Submitting...' : 'Submit Content'}
                    </button>
                  )}

                  {selectedPartnership.brand?.website && (
                    <a
                      href={selectedPartnership.brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Brand Website
                    </a>
                  )}

                  <button
                    onClick={() => setSelectedPartnership(null)}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
