'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'
import {
  FileText,
  Users,
  MessageSquare,
  Plus,
  ArrowRight,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BrandProfile {
  company_name: string
  industry: string | null
  onboarding_completed: boolean
}

interface DashboardStats {
  activeBriefs: number
  totalResponses: number
  activePartnerships: number
  pendingMessages: number
}

export default function BrandDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    activeBriefs: 0,
    totalResponses: 0,
    activePartnerships: 0,
    pendingMessages: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/brand/dashboard')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        if (response.status === 403) {
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to fetch dashboard')
      }

      const data = await response.json()
      setBrandProfile(data.brandProfile)
      setStats(data.stats || {
        activeBriefs: 0,
        totalResponses: 0,
        activePartnerships: 0,
        pendingMessages: 0
      })
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    } finally {
      setLoading(false)
    }
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
          <p className="text-gray-600">Loading your dashboard...</p>
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
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-light text-gray-800 mb-2">
            {greeting}, {brandProfile?.company_name || 'there'}
          </h1>
          <p className="text-gray-600">
            Connect with wellness-focused creators who align with your brand
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <WellnessCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-800">{stats.activeBriefs}</p>
                <p className="text-sm text-gray-500">Active Briefs</p>
              </div>
            </div>
          </WellnessCard>

          <WellnessCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-800">{stats.totalResponses}</p>
                <p className="text-sm text-gray-500">Creator Responses</p>
              </div>
            </div>
          </WellnessCard>

          <WellnessCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-800">{stats.activePartnerships}</p>
                <p className="text-sm text-gray-500">Active Partnerships</p>
              </div>
            </div>
          </WellnessCard>

          <WellnessCard className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-800">{stats.pendingMessages}</p>
                <p className="text-sm text-gray-500">New Messages</p>
              </div>
            </div>
          </WellnessCard>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Create New Brief CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <WellnessCard className="p-6 h-full" glow>
              <div className="flex flex-col h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mb-4">
                  <Plus className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-medium text-gray-800 mb-2">
                  Create Campaign Brief
                </h2>
                <p className="text-gray-600 mb-6 flex-1">
                  Describe your ideal partnership and let our AI match you with
                  creators who are actively looking for collaborations like yours.
                </p>
                <Link href="/brand/dashboard/briefs/new">
                  <WellnessButton variant="primary" className="w-full">
                    Create New Brief
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </WellnessButton>
                </Link>
              </div>
            </WellnessCard>
          </motion.div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <WellnessCard className="p-6 h-full">
              <h2 className="text-xl font-medium text-gray-800 mb-4">
                How It Works
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-medium text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Submit a Brief</h3>
                    <p className="text-sm text-gray-600">Describe your campaign, budget, and ideal creator profile</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-pink-600 font-medium text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">AI Matches Creators</h3>
                    <p className="text-sm text-gray-600">We find creators who are available and align with your brand</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-medium text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">Creators Respond</h3>
                    <p className="text-sm text-gray-600">Interested creators say Yes, and you connect directly</p>
                  </div>
                </div>
              </div>
            </WellnessCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2"
          >
            <WellnessCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium text-gray-800">Recent Activity</h2>
                <Link href="/brand/dashboard/briefs" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  View all briefs
                </Link>
              </div>

              {stats.activeBriefs === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Create your first campaign brief to start connecting with creators</p>
                  <Link href="/brand/dashboard/briefs/new">
                    <WellnessButton variant="secondary">
                      Create Your First Brief
                    </WellnessButton>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 text-sm">Your recent briefs will appear here</p>
                </div>
              )}
            </WellnessCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
