import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
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
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      throw profileError
    }

    if (!profile) {
      console.error('No profile found for user ID:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('Found profile:', profile.instagram_username)

    // Get recent Instagram posts
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10)

    if (postsError) {
      console.error('Posts fetch error:', postsError)
    }

    // Calculate engagement rate from recent posts
    let calculatedEngagementRate = 0
    if (posts && posts.length > 0 && profile.follower_count > 0) {
      // Filter posts within the selected time range
      let postsInRange = posts
      if (timeRange !== '30d') {
        const cutoffDate = new Date()
        const daysToSubtract = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30
        cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract)
        
        postsInRange = posts.filter(post => {
          const postDate = new Date(post.timestamp)
          return postDate >= cutoffDate
        })
      }
      
      if (postsInRange.length > 0) {
        const totalEngagement = postsInRange.reduce((sum, post) => {
          return sum + (post.like_count || 0) + (post.comments_count || 0)
        }, 0)
        const avgEngagement = totalEngagement / postsInRange.length
        calculatedEngagementRate = (avgEngagement / profile.follower_count) * 100
        
        console.log('Engagement calculation:', {
          timeRange,
          totalEngagement,
          avgEngagement,
          followerCount: profile.follower_count,
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
      .from('user_performance_metrics')
      .select('total_followers, average_engagement_rate, total_posts, date')
      .eq('user_id', userId)
      .gte('date', historicalDate.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1)

    console.log('Historical metrics query:', {
      userId,
      lookingForDate: historicalDate.toISOString().split('T')[0],
      found: historicalMetrics?.length || 0,
      data: historicalMetrics?.[0],
      error: historicalError
    })

    // Also check if ANY historical data exists
    const { data: anyHistoricalData } = await supabaseAdmin
      .from('user_performance_metrics')
      .select('date, total_followers, average_engagement_rate, total_posts')
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
      const oldFollowers = historicalMetrics[0].total_followers || profile.follower_count
      const oldEngagement = historicalMetrics[0].average_engagement_rate || calculatedEngagementRate
      const oldPosts = historicalMetrics[0].total_posts || 0

      // Calculate posts published in this time period
      const postsPublished = postsInTimeRange || 0

      metrics = {
        followerChange: oldFollowers > 0 ? ((profile.follower_count - oldFollowers) / oldFollowers) * 100 : 0,
        engagementChange: oldEngagement > 0 ? ((calculatedEngagementRate - oldEngagement) / oldEngagement) * 100 : 0,
        postsChange: oldPosts > 0 ? ((profile.posts_count - oldPosts) / oldPosts) * 100 : 0,
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
        previousFollowers: profile.follower_count,
        previousEngagement: calculatedEngagementRate,
        previousPosts: profile.posts_count
      }
    }

    return NextResponse.json({
      profile: {
        ...profile,
        engagement_rate: calculatedEngagementRate
      },
      posts: posts || [],
      metrics
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