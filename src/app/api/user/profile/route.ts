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

    console.log('Looking for user with ID:', userId)

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
      const totalEngagement = posts.reduce((sum, post) => {
        return sum + (post.like_count || 0) + (post.comments_count || 0)
      }, 0)
      const avgEngagement = totalEngagement / posts.length
      calculatedEngagementRate = (avgEngagement / profile.follower_count) * 100
    }

    // Update engagement rate in profile
    if (calculatedEngagementRate > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ engagement_rate: calculatedEngagementRate })
        .eq('id', userId)
    }

    // Get historical metrics (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: historicalMetrics } = await supabaseAdmin
      .from('user_performance_metrics')
      .select('total_followers, average_engagement_rate')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(1)

    let metrics = null
    if (historicalMetrics && historicalMetrics.length > 0) {
      const oldFollowers = historicalMetrics[0].total_followers || profile.follower_count
      const oldEngagement = historicalMetrics[0].average_engagement_rate || calculatedEngagementRate

      metrics = {
        followerChange: oldFollowers > 0 ? ((profile.follower_count - oldFollowers) / oldFollowers) * 100 : 0,
        engagementChange: oldEngagement > 0 ? ((calculatedEngagementRate - oldEngagement) / oldEngagement) * 100 : 0,
        previousFollowers: oldFollowers,
        previousEngagement: oldEngagement
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