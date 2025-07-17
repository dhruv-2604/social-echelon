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

    return NextResponse.json({
      profile,
      posts: posts || []
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