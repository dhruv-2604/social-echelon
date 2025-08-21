import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Find user by email
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, password_hash, full_name, instagram_username, subscription_status')
      .eq('email', email.toLowerCase())
      .single() as { data: any, error: any }

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user has a password (might be Instagram-only login)
    if (!user.password_hash) {
      return NextResponse.json(
        { error: 'Please sign in with Instagram' },
        { status: 401 }
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash as string)
    
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Check if Instagram is connected
    const { data: tokenData } = await supabaseAdmin
      .from('user_tokens')
      .select('instagram_access_token')
      .eq('user_id', user.id)
      .single()

    const needsInstagramConnection = !tokenData?.instagram_access_token

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        instagramUsername: user.instagram_username,
        subscriptionStatus: user.subscription_status
      },
      needsInstagramConnection,
      redirectTo: needsInstagramConnection ? '/auth/connect' : '/dashboard'
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    )
  }
}