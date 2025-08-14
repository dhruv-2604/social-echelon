import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { InstagramAPI } from '@/lib/instagram'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '30d'

    console.log('Looking for user with ID:', userId, 'Time range:', timeRange)

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
      console.error('No profile found for user ID:', userId)
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

    console.log('Found profile:', typedProfile.instagram_username)

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
      userId,
      lookingForDate: historicalDate.toISOString().split('T')[0],
      found: historicalMetrics?.length || 0,
      data: historicalMetrics?.[0],
      error: historicalError
    })

    // Also check if ANY historical data exists
    const { data: anyHistoricalData } = await supabaseAdmin
      .from('user_performance_summary')
      .select('date, follower_count, avg_engagement_rate, total_posts')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)

    console.log('Any historical data for user:', anyHistoricalData)

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
    console.log('Attempting to fetch Instagram insights for user:', userId)
    
    try {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('user_tokens')
        .select('instagram_access_token')
        .eq('user_id', userId)
        .single()

      console.log('Token query result:', { 
        hasToken: !!(tokenData as any)?.instagram_access_token,
        tokenError,
        tokenLength: (tokenData as any)?.instagram_access_token?.length 
      })

      if (tokenError) {
        console.log('Token fetch error:', tokenError)
      } else if ((tokenData as any)?.instagram_access_token) {
        console.log('Found token, attempting to fetch insights...')
        const instagramApi = new InstagramAPI((tokenData as any).instagram_access_token)
        insights = await instagramApi.getAccountInsights()
        console.log('Successfully fetched Instagram insights:', insights)
      } else {
        console.log('No Instagram token found for user:', userId)
      }
    } catch (insightsError) {
      console.error('Failed to fetch Instagram insights:', insightsError)
      console.error('Error details:', {
        message: insightsError instanceof Error ? insightsError.message : 'Unknown error',
        stack: insightsError instanceof Error ? insightsError.stack : undefined
      })
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
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, email } = body

    // Update user profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        email,
        updated_at: new Date().toISOString()
      })
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
}