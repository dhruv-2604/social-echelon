import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has completed brand matching profile
    const { data: creatorProfile, error } = await supabaseAdmin
      .from('creator_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !creatorProfile) {
      return NextResponse.json({ hasProfile: false })
    }

    return NextResponse.json({ 
      hasProfile: true,
      profile: creatorProfile.profile_data,
      onboardingCompleted: creatorProfile.onboarding_completed
    })

  } catch (error) {
    console.error('Error fetching creator profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}