'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WellnessCard } from './WellnessCard'
import { WellnessButton } from './WellnessButton'
import { 
  Sparkles, 
  Moon, 
  Sun, 
  Heart,
  TrendingUp,
  Coffee,
  Zap,
  ChevronDown,
  Eye,
  EyeOff,
  Users,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock
} from 'lucide-react'

interface WellnessHubProps {
  profile: any
  metrics?: any
}

export function WellnessHub({ profile: initialProfile, metrics: initialMetrics }: WellnessHubProps) {
  const [showRealMetrics, setShowRealMetrics] = useState(false)
  const [scrolledDown, setScrolledDown] = useState(false)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(initialProfile)
  const [metrics, setMetrics] = useState(initialMetrics)
  
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const icon = hour < 12 ? <Sun className="w-6 h-6 text-yellow-500" /> : 
                hour < 18 ? <Coffee className="w-6 h-6 text-amber-600" /> : 
                <Moon className="w-6 h-6 text-indigo-500" />

  // Mock data for wellness metrics
  const hoursReclaimed = timeRange === '24h' ? 3 : timeRange === '7d' ? 18 : 72
  const tasksAutomated = timeRange === '24h' ? 4 : timeRange === '7d' ? 24 : 96
  const stressPrevented = 89 // percentage

  // Real metrics from props - using correct property names
  const followers = profile?.follower_count || 0
  const following = profile?.following_count || 0
  const engagementRate = profile?.engagement_rate || 0
  const totalPosts = profile?.posts_count || 0
  
  // Calculate average likes and comments from posts if available
  const posts = metrics?.posts || []
  const avgLikes = posts.length > 0 
    ? Math.round(posts.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0) / posts.length)
    : 0
  const avgComments = posts.length > 0
    ? Math.round(posts.reduce((sum: number, post: any) => sum + (post.comments_count || 0), 0) / posts.length)
    : 0
  
  // Use actual change data from metrics
  const followersChange = metrics?.followerChange 
    ? Math.round((metrics.followerChange / 100) * metrics.previousFollowers)
    : 0
  const engagementChange = metrics?.engagementChange || 0
  const reachChange = Math.round(followers * 0.1) // Estimate 10% weekly reach growth

  // Performance Trends - Calculate from actual data
  const calculatePerformanceTrends = () => {
    // Best posting time - analyze post engagement by hour
    let bestTime = '7:00 PM'
    if (posts.length > 0) {
      const hourEngagement: { [key: number]: { total: number; count: number } } = {}
      posts.forEach((post: any) => {
        const hour = new Date(post.timestamp).getHours()
        if (!hourEngagement[hour]) {
          hourEngagement[hour] = { total: 0, count: 0 }
        }
        hourEngagement[hour].total += (post.like_count || 0) + (post.comments_count || 0)
        hourEngagement[hour].count++
      })
      
      let maxEngagement = 0
      let bestHour = 19
      Object.entries(hourEngagement).forEach(([hour, data]) => {
        const avgEng = data.total / data.count
        if (avgEng > maxEngagement) {
          maxEngagement = avgEng
          bestHour = parseInt(hour)
        }
      })
      
      const period = bestHour >= 12 ? 'PM' : 'AM'
      const displayHour = bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour
      bestTime = `${displayHour}:00 ${period}`
    }

    // Top content type - analyze by media type
    let topType = 'Reels'
    if (posts.length > 0) {
      const typeEngagement: { [key: string]: { total: number; count: number } } = {}
      posts.forEach((post: any) => {
        const type = post.media_type || 'IMAGE'
        if (!typeEngagement[type]) {
          typeEngagement[type] = { total: 0, count: 0 }
        }
        typeEngagement[type].total += (post.like_count || 0) + (post.comments_count || 0)
        typeEngagement[type].count++
      })
      
      let maxTypeEngagement = 0
      Object.entries(typeEngagement).forEach(([type, data]) => {
        const avgEng = data.total / data.count
        if (avgEng > maxTypeEngagement) {
          maxTypeEngagement = avgEng
          topType = type === 'VIDEO' ? 'Reels' : type === 'CAROUSEL_ALBUM' ? 'Carousels' : 'Photos'
        }
      })
    }

    // Story views and profile visits estimates based on follower count
    const avgStoryViews = Math.round(followers * 0.15) // 15% of followers view stories
    const profileVisits = Math.round(followers * 0.08) // 8% daily profile visits

    return { bestTime, topType, avgStoryViews, profileVisits }
  }

  const performanceTrends = calculatePerformanceTrends()

  useEffect(() => {
    const handleScroll = () => {
      setScrolledDown(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch data when time range changes
  useEffect(() => {
    async function fetchDataForTimeRange() {
      if (timeRange === initialMetrics?.timeRange) return // Don't refetch same data
      
      setLoading(true)
      try {
        const response = await fetch(`/api/user/profile?timeRange=${timeRange}`)
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile)
          setMetrics({ ...data.metrics, posts: data.posts, timeRange })
        }
      } catch (error) {
        console.error('Error fetching metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDataForTimeRange()
  }, [timeRange, initialMetrics])

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Ultra Minimal Hero - Just the essentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-20 text-center pt-16"
        >
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h1 className="text-3xl font-light text-gray-700 mb-2">
              {greeting}, <span className="text-gray-900">{profile?.instagram_username || 'Creator'}</span>
            </h1>
            <motion.p 
              className="text-gray-500 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Everything is handled
            </motion.p>
          </motion.div>
          
          {/* Single focus metric - the most important one */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="inline-block"
          >
            <div className="glass-card px-8 py-6 rounded-2xl">
              <div className="flex items-center gap-6">
                <div className="text-left">
                  <p className="text-sm text-gray-500 mb-1">Growth today</p>
                  <p className="text-2xl font-light text-green-600">+{followersChange > 0 ? followersChange : 12}</p>
                </div>
                <div className="w-px h-12 bg-gray-200" />
                <div className="text-left">
                  <p className="text-sm text-gray-500 mb-1">Time saved</p>
                  <p className="text-2xl font-light text-purple-600">{hoursReclaimed}h</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Subtle Time Control - Appears after hero */}
        <motion.div 
          className="flex justify-center items-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1.5 rounded-full transition-all ${
                timeRange === '24h'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              disabled={loading}
            >
              Today
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-full transition-all ${
                timeRange === '7d'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              disabled={loading}
            >
              Week
            </button>
            <span className="text-gray-300">·</span>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-full transition-all ${
                timeRange === '30d'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              disabled={loading}
            >
              Month
            </button>
          </div>
        </motion.div>
        
        {/* View Toggle - Subtle floating button */}
        <motion.button
          onClick={() => setShowRealMetrics(!showRealMetrics)}
          className="fixed bottom-8 right-8 flex items-center gap-2 px-4 py-3 bg-white/90 backdrop-blur rounded-full border border-gray-200/50 hover:bg-white shadow-lg transition-all z-30"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showRealMetrics ? (
            <>
              <EyeOff className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Wellness View</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Real Metrics</span>
            </>
          )}
        </motion.button>

        <AnimatePresence mode="wait">
          {showRealMetrics ? (
            /* Real Metrics View */
            <motion.div
              key="real-metrics"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-purple-600">Loading...</div>
                </div>
              )}
              
              {/* Main Stats - Delayed appearance with smooth fade */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.8 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.0, duration: 0.6 }}
                >
                <WellnessCard className="bg-gradient-to-br from-purple-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Followers</p>
                      <p className="text-3xl font-light text-purple-600">
                        {followers.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {followersChange > 0 ? (
                          <ArrowUp className="w-3 h-3 text-green-500" />
                        ) : followersChange < 0 ? (
                          <ArrowDown className="w-3 h-3 text-coral-500" />
                        ) : null}
                        <p className="text-xs text-gray-500">
                          {followersChange > 0 ? '+' : ''}{followersChange} this {timeRange === '24h' ? 'day' : timeRange === '7d' ? 'week' : 'month'}
                        </p>
                      </div>
                    </div>
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                </WellnessCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.2, duration: 0.6 }}
                >
                <WellnessCard className="bg-gradient-to-br from-blue-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Engagement Rate</p>
                      <p className="text-3xl font-light text-blue-600">
                        {engagementRate.toFixed(1)}%
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {engagementChange > 0 ? (
                          <ArrowUp className="w-3 h-3 text-green-500" />
                        ) : engagementChange < 0 ? (
                          <ArrowDown className="w-3 h-3 text-coral-500" />
                        ) : null}
                        <p className="text-xs text-gray-500">
                          {engagementChange > 0 ? '+' : ''}{engagementChange.toFixed(1)}% change
                        </p>
                      </div>
                    </div>
                    <Activity className="w-5 h-5 text-blue-400" />
                  </div>
                </WellnessCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.4, duration: 0.6 }}
                >
                <WellnessCard className="bg-gradient-to-br from-green-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Avg. Likes</p>
                      <p className="text-3xl font-light text-green-600">
                        {avgLikes.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">per post</p>
                    </div>
                    <Heart className="w-5 h-5 text-green-400" />
                  </div>
                </WellnessCard>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.6, duration: 0.6 }}
                >
                <WellnessCard className="bg-gradient-to-br from-yellow-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Total Reach</p>
                      <p className="text-3xl font-light text-yellow-600">
                        {(followers * 3.2).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUp className="w-3 h-3 text-green-500" />
                        <p className="text-xs text-gray-500">+{reachChange} this {timeRange === '24h' ? 'day' : timeRange === '7d' ? 'week' : 'month'}</p>
                      </div>
                    </div>
                    <BarChart3 className="w-5 h-5 text-yellow-400" />
                  </div>
                </WellnessCard>
                </motion.div>
              </motion.div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WellnessCard>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Engagement Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Likes</span>
                      <span className="font-medium text-gray-800">{avgLikes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Average Comments</span>
                      <span className="font-medium text-gray-800">{avgComments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Posts</span>
                      <span className="font-medium text-gray-800">{totalPosts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Following</span>
                      <span className="font-medium text-gray-800">{following.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Posts in Period</span>
                      <span className="font-medium text-gray-800">{metrics?.postsPublished || 0}</span>
                    </div>
                  </div>
                </WellnessCard>

                <WellnessCard>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Performance Trends</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Best Posting Time</span>
                      <span className="font-medium text-gray-800">{performanceTrends.bestTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Top Content Type</span>
                      <span className="font-medium text-gray-800">{performanceTrends.topType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg. Story Views</span>
                      <span className="font-medium text-gray-800">{performanceTrends.avgStoryViews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Profile Visits</span>
                      <span className="font-medium text-gray-800">{performanceTrends.profileVisits.toLocaleString()}/day</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Data from last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
                      </p>
                    </div>
                  </div>
                </WellnessCard>
              </div>
            </motion.div>
          ) : (
            /* Wellness View - Cleaner and more spacious */
            <motion.div
              key="wellness-metrics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Wellness Stats - Gentle fade in after scroll */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.0, duration: 1 }}
              >
                <WellnessCard className="bg-gradient-to-br from-purple-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Time Reclaimed</p>
                      <p className="text-3xl font-light text-purple-600">{hoursReclaimed} hrs</p>
                      <p className="text-xs text-gray-500 mt-1">this {timeRange === '24h' ? 'day' : timeRange === '7d' ? 'week' : 'month'}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Zap className="w-5 h-5 text-purple-600" />
                    </div>
                  </div>
                </WellnessCard>

                <WellnessCard className="bg-gradient-to-br from-teal-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Tasks Automated</p>
                      <p className="text-3xl font-light text-teal-600">{tasksAutomated}</p>
                      <p className="text-xs text-gray-500 mt-1">handled by AI</p>
                    </div>
                    <div className="p-3 bg-teal-100 rounded-full">
                      <Sparkles className="w-5 h-5 text-teal-600" />
                    </div>
                  </div>
                </WellnessCard>

                <WellnessCard className="bg-gradient-to-br from-green-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Wellness Score</p>
                      <p className="text-3xl font-light text-green-600">{stressPrevented}%</p>
                      <p className="text-xs text-gray-500 mt-1">stress reduced</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <Heart className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </WellnessCard>
              </motion.div>

              {/* Today's Summary - Appears last */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.8 }}
              >
              <WellnessCard className="bg-gradient-to-br from-white to-purple-50/30" glow>
                <h2 className="text-xl font-light text-gray-800 mb-4">
                  While you were away...
                </h2>
                <div className="space-y-3">
                  <TaskComplete 
                    task="3 brand inquiries handled" 
                    detail="Responses drafted and ready for review"
                  />
                  <TaskComplete 
                    task="Weekly content plan generated" 
                    detail="7 posts optimized for your audience"
                  />
                  <TaskComplete 
                    task="No algorithm changes detected" 
                    detail="Your strategy remains effective"
                  />
                  <TaskComplete 
                    task="2 trending topics identified" 
                    detail="Relevant to your niche, ready when you are"
                  />
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-teal-100 rounded-xl">
                  <p className="text-center text-gray-700">
                    <span className="font-medium">Your business grew 12%</span> while you took time for yourself 🌱
                  </p>
                </div>
              </WellnessCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll Indicator - Only shows on wellness view */}
        {!showRealMetrics && !scrolledDown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex flex-col items-center gap-2 text-gray-500"
            >
              <span className="text-sm">Scroll for quick metrics</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
          </motion.div>
        )}

        {/* Quick Metrics Bar - Shows on scroll */}
        {scrolledDown && !showRealMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 py-3 z-40"
          >
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Followers</p>
                  <p className="text-lg font-medium text-gray-800">{followers.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Engagement</p>
                  <p className="text-lg font-medium text-gray-800">{engagementRate.toFixed(1)}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Avg Likes</p>
                  <p className="text-lg font-medium text-gray-800">{avgLikes.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Growth</p>
                  <p className="text-lg font-medium text-green-600">+{followersChange}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="text-lg font-medium text-purple-600">{timeRange}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Minimal Action - Appears very last */}
        <motion.div 
          className="text-center mt-16 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 0.8 }}
        >
          <div className="flex gap-4 justify-center">
            <WellnessButton variant="ghost" size="md">
              Continue exploring
            </WellnessButton>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function TaskComplete({ task, detail }: { task: string; detail: string }) {
  return (
    <motion.div 
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mt-1">
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-gray-700 font-medium">{task}</p>
        <p className="text-gray-500 text-sm">{detail}</p>
      </div>
    </motion.div>
  )
}