import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username

    // Get creator profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        instagram_username,
        full_name,
        avatar_url,
        follower_count,
        engagement_rate,
        posts_count,
        bio,
        niche,
        content_style
      `)
      .eq('instagram_username', username)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Get creator's brand matching profile if exists
    const { data: creatorProfile } = await supabaseAdmin
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', profile.id)
      .single()

    // Get recent posts for portfolio
    const { data: recentPosts } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', profile.id)
      .order('timestamp', { ascending: false })
      .limit(9)

    // Combine all data
    const creatorData = {
      ...profile,
      profile_data: creatorProfile?.profile_data,
      recent_posts: recentPosts
    }

    return NextResponse.json({ 
      creator: creatorData,
      success: true 
    })

  } catch (error) {
    console.error('Error fetching creator profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch creator profile' },
      { status: 500 }
    )
  }
}