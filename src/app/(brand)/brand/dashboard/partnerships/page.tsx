'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, DollarSign, Users, CheckCircle, Clock, X, Building2,
  Star, Upload, CreditCard, FileCheck, Heart, ExternalLink,
  ThumbsUp, AlertCircle, Filter
} from 'lucide-react'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'

// Types
interface Deliverable {
  id: string
  type: 'post' | 'story' | 'reel' | 'ugc' | 'other'
  description?: string
  quantity: number
  completed: number
  dueDate?: string
}

type PartnershipStatus = 'negotiating' | 'active' | 'content_pending' | 'review' | 'completed' | 'cancelled'

interface Partnership {
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
  creator?: {
    username: string
    fullName: string
    avatarUrl?: string
    followers?: number
    niche?: string
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

// Helper functions
const formatDate = (dateString: string | null) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

export default function BrandPartnershipsPage() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([])
  const [partnershipStats, setPartnershipStats] = useState<PartnershipStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Action states
  const [approvingContent, setApprovingContent] = useState<string | null>(null)
  const [markingPayment, setMarkingPayment] = useState<string | null>(null)
  const [ratingPartnership, setRatingPartnership] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState<number>(5)

  useEffect(() => {
    fetchPartnerships()
  }, [])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPartnership) {
        setSelectedPartnership(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [selectedPartnership])

  async function fetchPartnerships() {
    try {
      const res = await fetch('/api/brand/partnerships')
      if (res.ok) {
        const data = await res.json()
        setPartnerships(data.partnerships || [])
        setPartnershipStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching partnerships:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleApproveContent(partnershipId: string) {
    setApprovingContent(partnershipId)
    try {
      const res = await fetch(`/api/brand/partnerships/${partnershipId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        await fetchPartnerships()
        setSelectedPartnership(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to approve content')
      }
    } catch (error) {
      console.error('Error approving content:', error)
      alert('Failed to approve content')
    } finally {
      setApprovingContent(null)
    }
  }

  async function handleMarkPayment(partnershipId: string, completeAfter: boolean = false) {
    setMarkingPayment(partnershipId)
    try {
      const res = await fetch(`/api/brand/partnerships/${partnershipId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completeAfterPayment: completeAfter })
      })

      if (res.ok) {
        await fetchPartnerships()
        setSelectedPartnership(null)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to mark payment')
      }
    } catch (error) {
      console.error('Error marking payment:', error)
      alert('Failed to mark payment')
    } finally {
      setMarkingPayment(null)
    }
  }

  async function handleRatePartnership(partnershipId: string, rating: number) {
    setRatingPartnership(partnershipId)
    try {
      const res = await fetch(`/api/brand/partnerships/${partnershipId}/rate`, {
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

  // Filter partnerships
  const filteredPartnerships = partnerships.filter(p => {
    // Status filter
    if (filter === 'active' && !['negotiating', 'active', 'content_pending', 'review'].includes(p.status)) return false
    if (filter === 'pending' && p.status !== 'content_pending') return false
    if (filter === 'completed' && p.status !== 'completed') return false

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      if (
        !p.creator?.username?.toLowerCase().includes(search) &&
        !p.creator?.fullName?.toLowerCase().includes(search) &&
        !p.brief?.title?.toLowerCase().includes(search)
      ) {
        return false
      }
    }

    return true
  })

  const activePartnerships = filteredPartnerships.filter(p => !['completed', 'cancelled'].includes(p.status))
  const completedPartnerships = filteredPartnerships.filter(p => p.status === 'completed')
  const pendingReviewCount = partnerships.filter(p => p.status === 'content_pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BreathingLoader text="Loading your partnerships..." size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-light text-gray-800 mb-2">
            Your Partnerships
          </h1>
          <p className="text-gray-600">
            Track and manage your creator collaborations
          </p>
        </motion.div>

        {/* Stats */}
        {partnershipStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="text-2xl font-light text-gray-900">{partnershipStats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-100 shadow-sm">
              <div className="text-2xl font-light text-blue-600">{partnershipStats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="text-2xl font-light text-purple-600">{pendingReviewCount}</div>
                {pendingReviewCount > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                    Review
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-100 shadow-sm">
              <div className="text-2xl font-light text-green-600">{partnershipStats.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-100 shadow-sm">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-2xl font-light text-gray-900">
                  {partnershipStats.avgRating?.toFixed(1) || '-'}
                </span>
              </div>
              <div className="text-sm text-gray-600">Avg Rating</div>
            </div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-4 mb-6"
        >
          {/* Filter Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'pending', label: 'Pending Review' },
              { key: 'completed', label: 'Completed' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as typeof filter)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by creator name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Partnerships List */}
        {partnerships.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">No partnerships yet</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              When creators accept your campaign briefs, partnerships will appear here.
            </p>
          </motion.div>
        ) : filteredPartnerships.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Active Partnerships */}
            {activePartnerships.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Active Partnerships</h2>
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
                          {partnership.creator?.avatarUrl ? (
                            <img
                              src={partnership.creator.avatarUrl}
                              alt={partnership.creator.fullName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-purple-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {partnership.creator?.fullName || partnership.creator?.username || 'Creator'}
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
                                className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
                                style={{ width: `${getDeliverableProgress(partnership.deliverables)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Status Indicators */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {partnership.status === 'content_pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Needs Review
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
                <h2 className="text-lg font-medium text-gray-900 mb-4">Completed</h2>
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
                          {partnership.creator?.avatarUrl ? (
                            <img
                              src={partnership.creator.avatarUrl}
                              alt={partnership.creator.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-green-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {partnership.creator?.fullName || partnership.creator?.username || 'Creator'}
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
                          {partnership.creatorRating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">{partnership.creatorRating}</span>
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
      </div>

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
                    {selectedPartnership.creator?.avatarUrl ? (
                      <img
                        src={selectedPartnership.creator.avatarUrl}
                        alt={selectedPartnership.creator.fullName}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Users className="w-8 h-8 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <h2 id="partnership-detail-title" className="text-xl font-medium text-gray-900">
                        {selectedPartnership.creator?.fullName || selectedPartnership.creator?.username || 'Creator'}
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
                {/* Creator Info */}
                {selectedPartnership.creator && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      Creator Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Username</div>
                        <div className="font-medium">@{selectedPartnership.creator.username}</div>
                      </div>
                      {selectedPartnership.creator.followers && (
                        <div>
                          <div className="text-gray-500">Followers</div>
                          <div className="font-medium">{selectedPartnership.creator.followers.toLocaleString()}</div>
                        </div>
                      )}
                      {selectedPartnership.creator.niche && (
                        <div>
                          <div className="text-gray-500">Niche</div>
                          <div className="font-medium capitalize">{selectedPartnership.creator.niche}</div>
                        </div>
                      )}
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
                              className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
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
                          <div className="text-sm font-medium text-gray-900">Payment Sent</div>
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
                {selectedPartnership.status === 'completed' && !selectedPartnership.creatorRating && (
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Rate This Creator
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      How was your experience working with this creator?
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
                {selectedPartnership.creatorRating && (
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
                            star <= selectedPartnership.creatorRating!
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="ml-2 text-gray-600">({selectedPartnership.creatorRating}/5)</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons based on status */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  {/* Approve Content Button */}
                  {selectedPartnership.status === 'content_pending' && (
                    <button
                      onClick={() => handleApproveContent(selectedPartnership.id)}
                      disabled={approvingContent === selectedPartnership.id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {approvingContent === selectedPartnership.id ? 'Approving...' : 'Approve Content'}
                    </button>
                  )}

                  {/* Mark Payment Button */}
                  {selectedPartnership.status === 'review' && !selectedPartnership.paymentSentAt && (
                    <button
                      onClick={() => handleMarkPayment(selectedPartnership.id, true)}
                      disabled={markingPayment === selectedPartnership.id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-400 to-green-400 text-white rounded-lg hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {markingPayment === selectedPartnership.id ? 'Processing...' : 'Mark Payment & Complete'}
                    </button>
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
