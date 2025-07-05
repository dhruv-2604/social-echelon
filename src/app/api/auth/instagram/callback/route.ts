import { NextRequest, NextResponse } from 'next/server'
import { InstagramAPI } from '@/lib/instagram'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL('/auth/error?error=instagram_auth_denied', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', request.url))
    }

    // Exchange code for access token
    const accessToken = await InstagramAPI.exchangeCodeForToken(code)
    
    // Get Instagram profile data
    const instagramAPI = new InstagramAPI(accessToken)
    const profile = await instagramAPI.getProfile()
    const media = await instagramAPI.getMedia(10) // Get recent posts for analysis

    // Calculate engagement rate
    const totalEngagement = media.reduce((sum, post) => {
      return sum + (post.like_count || 0) + (post.comments_count || 0)
    }, 0)
    const avgEngagement = media.length > 0 ? totalEngagement / media.length : 0
    const engagementRate = profile.media_count > 0 ? (avgEngagement / profile.media_count) * 100 : 0

    // Check if user exists in our database
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('instagram_id', profile.id)
      .single()

    let userId: string
    
    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          instagram_username: profile.username,
          posts_count: profile.media_count,
          engagement_rate: engagementRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      if (updateError) {
        throw updateError
      }
      
      userId = existingUser.id
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: `${profile.username}@instagram.local`, // Temporary email
          instagram_id: profile.id,
          instagram_username: profile.username,
          posts_count: profile.media_count,
          engagement_rate: engagementRate,
          subscription_status: 'inactive'
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }
      
      userId = newUser.id
    }

    // Store access token securely (in production, encrypt this)
    const { error: tokenError } = await supabase
      .from('user_tokens')
      .upsert({
        user_id: userId,
        instagram_access_token: accessToken,
        updated_at: new Date().toISOString()
      })

    if (tokenError) {
      console.error('Token storage error:', tokenError)
    }

    // Set session cookie
    const cookieStore = cookies()
    cookieStore.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
    
  } catch (error) {
    console.error('Instagram callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/error?error=authentication_failed', request.url)
    )
  }
}