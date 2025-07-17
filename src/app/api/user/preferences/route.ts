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

    // Get user preferences
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('niche, primary_goal, content_style, target_audience, voice_tone, posting_frequency, preferences_set')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Preferences fetch error:', error)
      throw error
    }

    return NextResponse.json({ preferences: profile })

  } catch (error) {
    console.error('Preferences GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { niche, primary_goal, content_style, target_audience, voice_tone, posting_frequency } = body

    // Update user preferences
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({
        niche,
        primary_goal,
        content_style,
        target_audience,
        voice_tone,
        posting_frequency,
        preferences_set: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Preferences update error:', error)
      throw error
    }

    // Also trigger generation of new content plan if preferences changed
    if (profile) {
      // Clear existing content plans so new ones will be generated
      await supabaseAdmin
        .from('content_plans')
        .delete()
        .eq('user_id', userId)
    }

    return NextResponse.json({ preferences: profile })

  } catch (error) {
    console.error('Preferences PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}