import { NextRequest, NextResponse } from 'next/server'
import { withAuthAndValidation, withSecurityHeaders, requireAuth } from '@/lib/validation/middleware'
import { UserProfileUpdateSchema } from '@/lib/validation/schemas'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { InstagramAPI } from '@/lib/instagram'
import { RateLimiter } from '@/lib/rate-limiting'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Query parameters validation for GET request
const ProfileQuerySchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d']).default('30d')
})

export const GET = withSecurityHeaders(
  withAuthAndValidation({
    query: ProfileQuerySchema
  })(async (request: NextRequest, userId: string, { validatedQuery }) => {
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const timeRange = validatedQuery?.timeRange || '30d'

      console.log('Looking for user profile, time range:', timeRange)

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single() as { data: any; error: any }

    if (profileError) {
      console.error('Profile error:', profileError)
      throw profileError
    }

    if (!profile) {
      console.error('No profile found for authenticated user')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Type the profile to avoid TypeScript errors
    const typedProfile = profile as {
      id: string
      instagram_username: string
      follower_count: number
      posts_count: number
      engagement_rate: number
      [key: string]: any
    }

    console.log('Found profile for authenticated user')

    // Get recent Instagram posts
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10) as { data: any[] | null; error: any }

    if (postsError) {
      console.error('Posts fetch error:', postsError)
    }

    // Calculate engagement rate from recent posts
    let calculatedEngagementRate = 0
    if (posts && posts.length > 0 && typedProfile.follower_count > 0) {
      // Filter posts within the selected time range
      let postsInRange = posts
      if (timeRange !== '30d') {
        const cutoffDate = new Date()
        const daysToSubtract = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30
        cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract)
        
        postsInRange = posts.filter((post: any) => {
          const postDate = new Date(post.timestamp)
          return postDate >= cutoffDate
        })
      }
      
      if (postsInRange.length > 0) {
        const totalEngagement = postsInRange.reduce((sum: number, post: any) => {
          return sum + (post.like_count || 0) + (post.comments_count || 0)
        }, 0)
        const avgEngagement = totalEngagement / postsInRange.length
        calculatedEngagementRate = (avgEngagement / typedProfile.follower_count) * 100
        
        console.log('Engagement calculation:', {
          timeRange,
          totalEngagement,
          avgEngagement,
          followerCount: typedProfile.follower_count,
          engagementRate: calculatedEngagementRate,
          postsAnalyzed: postsInRange.length,
          totalPosts: posts.length
        })
      }
    }

    // Update engagement rate in profile
    if (calculatedEngagementRate > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ engagement_rate: calculatedEngagementRate })
        .eq('id', userId)
    }

    // Calculate days based on time range
    let daysAgo = 30
    switch (timeRange) {
      case '24h':
        daysAgo = 1
        break
      case '7d':
        daysAgo = 7
        break
      case '30d':
        daysAgo = 30
        break
    }

    // Get historical metrics
    const historicalDate = new Date()
    historicalDate.setDate(historicalDate.getDate() - daysAgo)

    const { data: historicalMetrics, error: historicalError } = await supabaseAdmin
      .from('user_performance_summary')
      .select('follower_count, avg_engagement_rate, total_posts, date')
      .eq('user_id', userId)
      .gte('date', historicalDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1) as { 
        data: Array<{
          follower_count: number
          avg_engagement_rate: number
          total_posts: number
          date: string
        }> | null
        error: any
      }

    console.log('Historical metrics query:', {
      lookingForDate: historicalDate.toISOString().split('T')[0],
      found: historicalMetrics?.length || 0,
      hasData: !!historicalMetrics?.[0],
      hasError: !!historicalError
    })

    // Also check if ANY historical data exists
    const { data: anyHistoricalData } = await supabaseAdmin
      .from('user_performance_summary')
      .select('date, follower_count, avg_engagement_rate, total_posts')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)

    console.log('Historical data entries found:', anyHistoricalData?.length || 0)

    // Count posts in the selected time range
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)
    
    const { count: postsInTimeRange } = await supabaseAdmin
      .from('instagram_posts')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .gte('timestamp', cutoffDate.toISOString())

    let metrics = null
    if (historicalMetrics && historicalMetrics.length > 0) {
      const oldFollowers = historicalMetrics[0].follower_count || typedProfile.follower_count
      const oldEngagement = historicalMetrics[0].avg_engagement_rate || calculatedEngagementRate
      const oldPosts = historicalMetrics[0].total_posts || 0

      // Calculate posts published in this time period
      const postsPublished = postsInTimeRange || 0

      metrics = {
        followerChange: oldFollowers > 0 ? ((typedProfile.follower_count - oldFollowers) / oldFollowers) * 100 : 0,
        engagementChange: oldEngagement > 0 ? ((calculatedEngagementRate - oldEngagement) / oldEngagement) * 100 : 0,
        postsChange: oldPosts > 0 ? ((typedProfile.posts_count - oldPosts) / oldPosts) * 100 : 0,
        postsPublished,
        previousFollowers: oldFollowers,
        previousEngagement: oldEngagement,
        previousPosts: oldPosts
      }
    } else {
      // If no historical data, just show posts published
      metrics = {
        followerChange: 0,
        engagementChange: 0,
        postsChange: 0,
        postsPublished: postsInTimeRange || 0,
        previousFollowers: typedProfile.follower_count,
        previousEngagement: calculatedEngagementRate,
        previousPosts: typedProfile.posts_count
      }
    }

    // Try to fetch Instagram insights if token is available
    let insights = null
    console.log('Attempting to fetch Instagram insights for authenticated user')
    
    try {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('user_tokens')
        .select('instagram_access_token')
        .eq('user_id', userId)
        .single()

      if (!tokenError && (tokenData as any)?.instagram_access_token) {
        const instagramApi = new InstagramAPI((tokenData as any).instagram_access_token)
        insights = await instagramApi.getAccountInsights()
      }
    } catch (insightsError) {
      // Silently fail - insights are optional
      // Don't fail the whole request if insights fail
    }

    return NextResponse.json({
      profile: {
        ...typedProfile,
        engagement_rate: calculatedEngagementRate
      },
      posts: posts || [],
      metrics,
      insights
    })

    } catch (error) {
      console.error('Profile API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      )
    }
  })
)

export const PATCH = withSecurityHeaders(
  withAuthAndValidation({
    body: UserProfileUpdateSchema
  })(async (request: NextRequest, userId: string, { validatedBody }) => {
    // Rate limit profile updates
    const rateCheck = await RateLimiter.checkRateLimit(
      userId,
      '/api/user/profile'
    )

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter?.toString() || '60' } }
      )
    }

    try {
      const supabaseAdmin = getSupabaseAdmin()

      if (!validatedBody) {
        return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
      }

      // Build update object with only provided fields
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (validatedBody.full_name !== undefined) updateData.full_name = validatedBody.full_name
      if (validatedBody.email !== undefined) updateData.email = validatedBody.email
      if (validatedBody.bio !== undefined) updateData.bio = validatedBody.bio
      if (validatedBody.location !== undefined) updateData.location = validatedBody.location
      if (validatedBody.website !== undefined) updateData.website = validatedBody.website

      // Update user profile
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        throw error
      }

      return NextResponse.json({ profile })

    } catch (error) {
      console.error('Profile update API error:', error)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }
  })
)