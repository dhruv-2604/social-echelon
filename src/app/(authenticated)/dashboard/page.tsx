'use client'

import { useEffect, useState } from 'react'
import { WellnessHub } from '@/components/wellness/WellnessHub'
import { BreathingLoader } from '@/components/wellness/BreathingLoader'
import { WellnessCard } from '@/components/wellness/WellnessCard'
import { WellnessButton } from '@/components/wellness/WellnessButton'

interface UserProfile {
  id: string
  instagram_username: string
  full_name: string
  avatar_url: string
  follower_count: number
  following_count: number
  posts_count: number
  engagement_rate: number
  subscription_tier: string
  subscription_status: string
}

interface InstagramPost {
  id: string
  instagram_post_id: string
  caption: string
  media_type: string
  media_url: string
  permalink: string
  timestamp: string
  like_count: number
  comments_count: number
}

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    async function fetchUserData() {
      try {
        // Add slight delay for smoother loading experience
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const response = await fetch(`/api/user/profile?timeRange=30d`)
        
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/'
            return
          }
          throw new Error('Failed to fetch profile')
        }
        
        const data = await response.json()
        setProfile(data.profile)
        setPosts(data.posts)
        setMetrics(data.metrics)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BreathingLoader 
          text="Preparing your wellness space..." 
          size="lg"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <WellnessCard className="max-w-md mx-auto text-center">
          <div className="space-y-4">
            <div className="text-6xl">🌿</div>
            <h2 className="text-xl font-light text-[var(--wellness-neutral-700)]">
              Let's take a breath
            </h2>
            <p className="text-[var(--wellness-neutral-500)]">
              Something needs a moment to reconnect. This is perfectly normal.
            </p>
            <WellnessButton 
              onClick={() => window.location.reload()} 
              variant="calm"
              size="md"
            >
              Try again gently
            </WellnessButton>
          </div>
        </WellnessCard>
      </div>
    )
  }

  return <WellnessHub profile={profile} metrics={{ ...metrics, posts }} />
}