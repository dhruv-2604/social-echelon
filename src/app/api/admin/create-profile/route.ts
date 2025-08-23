import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

// Admin endpoint to quickly create a profile and bypass payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, instagramUsername } = body
    
    // Only allow in development or with admin secret
    const adminSecret = request.headers.get('x-admin-secret')
    if (process.env.NODE_ENV === 'production' && adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabaseAdmin = getSupabaseAdmin()
    
    // Check if profile already exists
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    
    if (existing) {
      // Just log them in
      const cookieStore = await cookies()
      cookieStore.set('user_id', existing.id as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
      
      return NextResponse.json({
        success: true,
        message: 'Logged in to existing profile',
        userId: existing.id
      })
    }
    
    // Check if there's an orphaned token for this Instagram username
    const { data: tokenData } = await supabaseAdmin
      .from('user_tokens')
      .select('user_id')
      .eq('instagram_username', instagramUsername)
      .single()
    
    const userId = tokenData?.user_id || crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        password_hash: passwordHash,
        full_name: instagramUsername,
        instagram_username: instagramUsername,
        subscription_status: 'active',
        subscription_plan: 'harmony', // Give yourself the best plan
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    
    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('user_id', userId as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      userId,
      redirectTo: '/dashboard'
    })
    
  } catch (error) {
    console.error('Admin profile creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    )
  }
}