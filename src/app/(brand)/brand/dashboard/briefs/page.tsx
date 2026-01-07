'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import {
  FileText,
  Plus,
  Clock,
  Users,
  CheckCircle2,
  Pause,
  XCircle,
  ChevronRight,
  Loader2,
  Filter,
  ArrowLeft
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
  budget_min: number | null
  budget_max: number | null
  deadline: string | null
  status: string
  created_at: string
  response_counts: {
    total: number
    yes: number
    pending: number
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  paused: {
    label: 'Paused',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Pause className="w-4 h-4" />
  },
  completed: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-700',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    icon: <XCircle className="w-4 h-4" />
  }
}

export default function BriefsListPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all')

  useEffect(() => {
    fetchBriefs()
  }, [filter])

  async function fetchBriefs() {
    try {
      const response = await fetch(`/api/brand/briefs?status=${filter}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch briefs')
      }

      const data = await response.json()
      setBriefs(data.briefs || [])
    } catch (err) {
      console.error('Error fetching briefs:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading your briefs...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/brand/dashboard"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-2xl font-display font-light text-gray-800">
              Campaign Briefs
            </h1>
            <p className="text-gray-600">
              Manage your campaign briefs and track creator responses
            </p>
          </div>
          <Link href="/brand/dashboard/briefs/new">
            <WellnessButton variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              New Brief
            </WellnessButton>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'paused', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                filter === status
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Briefs List */}
        {briefs.length === 0 ? (
          <WellnessCard className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {filter === 'all' ? 'No briefs yet' : `No ${filter} briefs`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Create your first campaign brief to start connecting with creators'
                : `You don't have any ${filter} briefs at the moment`}
            </p>
            {filter === 'all' && (
              <Link href="/brand/dashboard/briefs/new">
                <WellnessButton variant="primary">
                  Create Your First Brief
                </WellnessButton>
              </Link>
            )}
          </WellnessCard>
        ) : (
          <div className="space-y-4">
            {briefs.map((brief, index) => {
              const statusConfig = STATUS_CONFIG[brief.status] || STATUS_CONFIG.active
              return (
                <motion.div
                  key={brief.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/brand/dashboard/briefs/${brief.id}`}>
                    <WellnessCard className="p-5 hover:shadow-md transition-all cursor-pointer group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-800 truncate">
                              {brief.title}
                            </h3>
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                              statusConfig.color
                            )}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </div>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {brief.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {brief.campaign_type.join(', ')}
                            </span>
                            <span className="flex items-center gap-1">
                              {formatBudget(brief.budget_min, brief.budget_max)}
                            </span>
                            {brief.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Due {formatDate(brief.deadline)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Response Stats */}
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-800">
                                {brief.response_counts.yes}
                              </span>
                              <span className="text-gray-500">interested</span>
                            </div>
                            {brief.response_counts.pending > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {brief.response_counts.pending} pending
                              </p>
                            )}
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        </div>
                      </div>
                    </WellnessCard>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
