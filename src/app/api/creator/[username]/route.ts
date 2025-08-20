import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    const username = params.username
    
    // Validate username parameter
    if (!username || typeof username !== 'string' || username.length > 100) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    // Get creator profile
  const supabaseAdmin = getSupabaseAdmin()
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
      .single() as { data: any; error: any }

    if (error || !profile) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // Get creator's brand matching profile if exists
    const { data: creatorProfile } = await supabaseAdmin
      .from('creator_profiles')
      .select('profile_data')
      .eq('user_id', profile.id as string)
      .single() as { data: any; error: any }

    // Get recent posts for portfolio
    const { data: recentPosts } = await supabaseAdmin
      .from('instagram_posts')
      .select('*')
      .eq('profile_id', profile.id as string)
      .order('timestamp', { ascending: false })
      .limit(9) as { data: any[] | null; error: any }

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