import { NextRequest, NextResponse } from 'next/server'
import { InstagramAPI } from '@/lib/instagram'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
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

    // Calculate engagement rate using actual follower count from Graph API
    const totalEngagement = media.reduce((sum, post) => {
      return sum + (post.like_count || 0) + (post.comments_count || 0)
    }, 0)
    const avgEngagement = media.length > 0 ? totalEngagement / media.length : 0
    const engagementRate = profile.followers_count > 0 ? (avgEngagement / profile.followers_count) * 100 : 0

    // Check if user exists in our database
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('instagram_id', profile.id)
      .single()

    let userId: string
    
    if (existingUser && !fetchError) {
      // Update existing user
      console.log('Updating existing user:', existingUser.id)
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          instagram_username: profile.username,
          full_name: profile.name,
          avatar_url: profile.profile_picture_url,
          follower_count: profile.followers_count,
          following_count: profile.follows_count,
          posts_count: profile.media_count,
          engagement_rate: engagementRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id as string)

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }
      
      userId = existingUser.id as string
    } else {
      // Create new user
      console.log('Creating new user for Instagram ID:', profile.id)
      const newUserId = crypto.randomUUID()
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          email: `${profile.username}@instagram.local`, // Temporary email
          instagram_id: profile.id,
          instagram_username: profile.username,
          full_name: profile.name,
          avatar_url: profile.profile_picture_url,
          follower_count: profile.followers_count,
          following_count: profile.follows_count,
          posts_count: profile.media_count,
          engagement_rate: engagementRate,
          subscription_status: 'inactive'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }
      
      userId = (newUser?.id as string) || newUserId
      console.log('Created user with ID:', userId)
    }

    // Store Instagram posts in database
    if (media.length > 0) {
      console.log('Storing', media.length, 'Instagram posts')
      const postsToInsert = media.map(post => ({
        profile_id: userId,
        instagram_post_id: post.id,
        caption: post.caption || '',
        media_type: post.media_type,
        media_url: post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0
      }))

      const { error: postsError } = await supabaseAdmin
        .from('instagram_posts')
        .upsert(postsToInsert, { onConflict: 'profile_id,instagram_post_id' })

      if (postsError) {
        console.error('Error storing posts:', postsError)
      } else {
        console.log('Successfully stored posts')
      }
    }

    // Store access token securely (in production, encrypt this)
    const { error: tokenError } = await supabaseAdmin
      .from('user_tokens')
      .upsert({
        user_id: userId,
        instagram_access_token: accessToken,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (tokenError) {
      console.error('Token storage error:', tokenError)
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Redirect to dashboard
    const dashboardUrl = new URL('/dashboard', request.url)
    console.log('Redirecting to dashboard:', dashboardUrl.toString())
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: dashboardUrl.toString()
      }
    })
    
  } catch (error) {
    console.error('Instagram callback error:', error)
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.redirect(
      new URL('/auth/error?error=authentication_failed', request.url)
    )
  }
}